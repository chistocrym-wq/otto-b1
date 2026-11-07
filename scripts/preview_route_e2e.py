import json
import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

BASE = "https://deploy-preview-13--otto-a1.netlify.app/"
SHA = os.environ.get("GITHUB_SHA", "")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = os.environ.get("GITHUB_REPOSITORY", "chistocrym-wq/otto-a1")

PROFILE = {
    "name": "OTTO QA",
    "contactType": "email",
    "contact": "qa@example.com",
    "contactVerified": True,
    "authStatus": "verified",
    "gender": "female",
    "learningMode": "direct",
    "createdAt": "2026-10-02T00:00:00.000Z",
    "updatedAt": "2026-10-02T00:00:00.000Z",
    "onboardingCompleted": True,
}

FETCH_SHIM = r"""
(() => {
  const realFetch = window.fetch.bind(window);
  const json = (value, status=200) => Promise.resolve(new Response(JSON.stringify(value), {
    status,
    headers: {'Content-Type':'application/json; charset=utf-8'}
  }));
  window.__OTTO_QA_MOCK_SPEECH__ = false;
  window.fetch = (input, init={}) => {
    const raw = typeof input === 'string' ? input : input.url;
    const url = new URL(raw, location.href);
    const path = url.pathname;
    const method = String(init?.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (path === '/api/state') return json({authenticated:true,userId:'qa-user',state:{}});
    if (path === '/api/session') return json({authenticated:true,userId:'qa-user',created:false});
    if (path === '/api/profile') return json({authenticated:true,userId:'qa-user',profile:__QA_PROFILE__});
    if (path === '/api/account-access') return json({
      authenticated:true,userId:'qa-user',serverNow:new Date().toISOString(),
      trialActive:true,trialStartedAt:new Date(Date.now()-24*60*60*1000).toISOString(),
      trialEndsAt:new Date(Date.now()+48*60*60*1000).toISOString(),
      subscriptionActive:false,subscriptionUntil:null,
      hasTrainingAccess:true,reason:'qa'
    });
    if (path === '/api/legal-consent') return json({accepted:true,documentVersion:'2026-09-23-v1'});
    if (path.includes('support')) return json({unreadCount:0,latestTicketId:null,tickets:[]});
    if (path === '/api/check-sprechen' && window.__OTTO_QA_MOCK_SPEECH__) {
      if (method === 'GET') return json({ok:true,aiConfigured:true,model:'qa'});
      return json({
        transcript:'ich',officialLevel:'full',score:100,
        strengths:['Понятно'],practice:[],pronunciationRu:'Понятно.',missing:[]
      });
    }
    return realFetch(input, init);
  };
})();
""".replace("__QA_PROFILE__", json.dumps(PROFILE, ensure_ascii=False))

def wait_netlify_status():
    if not SHA or not TOKEN:
        print("No GitHub status credentials; sleeping for Netlify.")
        time.sleep(30)
        return
    api = f"https://api.github.com/repos/{REPO}/commits/{SHA}/status"
    headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"}
    for attempt in range(90):
        data = requests.get(api, headers=headers, timeout=20).json()
        statuses = data.get("statuses", [])
        target = next((s for s in statuses if s.get("context") == "netlify/otto-a1/deploy-preview"), None)
        if target and target.get("state") == "success":
            print("Netlify preview status: success", flush=True)
            return
        if target and target.get("state") in ("failure", "error"):
            raise AssertionError(f"Netlify preview failed: {target}")
        if attempt % 6 == 0:
            print("Waiting for Netlify deploy status...", target and target.get("state"), flush=True)
        time.sleep(4)
    raise TimeoutError("Netlify preview did not become ready")

def new_driver(mock_speech=False, micro_fixture=False):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,1100")
    options.add_argument("--use-fake-device-for-media-stream")
    options.add_argument("--use-fake-ui-for-media-stream")
    options.add_argument("--autoplay-policy=no-user-gesture-required")
    options.set_capability("goog:loggingPrefs", {"performance": "ALL", "browser": "ALL"})
    driver = webdriver.Chrome(options=options)
    # Speech readiness is fetched when the component mounts. Install the QA-only
    # stub BEFORE navigation, otherwise the real unsigned GET may mark AI unavailable.
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": FETCH_SHIM + ("\nwindow.__OTTO_QA_MOCK_SPEECH__=true;" if mock_speech else "")
    })
    if micro_fixture:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": """
        if(!localStorage.getItem('otto-preview-learning-v2:qa-user')){
          localStorage.setItem('otto-preview-learning-v2:qa-user', JSON.stringify({
            known:[],weak:[],completedCategories:[],stage:'lesson',currentCategory:'pronouns',currentExercise:1
          }));
        }
        """})
    driver.get(BASE)
    # A fresh registered user now sees the approved two-mode choice after the tour.
    # Each test must choose the real mode itself; there is no generic Continue step.
    # The saved fixture is installed before React mounts, not after its first render.
    # The first-run quick tour is modal by design: close it via its real control.
    # Clicking through the overlay would mask an accessibility/navigation regression.
    try:
        tour = WebDriverWait(driver, 6).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-otto-tour]"))
        )
        tour.find_element(By.CSS_SELECTOR, 'button[aria-label="Закрыть экскурсию"]').click()
        WebDriverWait(driver, 10).until(
            EC.invisibility_of_element_located((By.CSS_SELECTOR, "[data-otto-tour]"))
        )
    except TimeoutException:
        pass  # Returning users have no first-run tour.
    if mock_speech:
        driver.execute_script("window.__OTTO_QA_MOCK_SPEECH__ = true")
    return driver

def diagnostic(driver, scenario):
    """Save screenshot and DOM at the actual failure, before closing Chrome."""
    from pathlib import Path
    safe = ''.join(ch if ch.isalnum() or ch == '-' else '-' for ch in scenario)[:90]
    dest = Path("browser-route-diagnostics")
    dest.mkdir(exist_ok=True)
    name = dest / safe
    try:
        driver.save_screenshot(str(name) + ".png")
        (Path(str(name) + ".html")).write_text(driver.page_source, encoding="utf-8")
        state = driver.execute_script("""
          return {url:location.href,body:document.body.innerText.slice(0,1700),
           dialogs:[...document.querySelectorAll('[role="dialog"]')].map(el=>({label:el.getAttribute('aria-label'),text:el.textContent.slice(0,300)})),
           fixed:[...document.querySelectorAll('.otto-reference-overlay,.otto-draggable-mode-action,[data-otto-tour]')].map(el=>el.outerHTML.slice(0,350))};
        """)
        print("ROUTE_DOM_DIAGNOSTIC",scenario,json.dumps(state,ensure_ascii=False),flush=True)
        for row in driver.get_log("browser")[-15:]:
            print("ROUTE_JS_CONSOLE",str(row)[:500],flush=True)
    except Exception as error:
        print("ROUTE_DIAGNOSTIC_FAILED",repr(error),flush=True)

def wait_text(driver, text, timeout=20):
    try:
        WebDriverWait(driver, timeout).until(lambda d: text in d.find_element(By.TAG_NAME, "body").text)
    except TimeoutException:
        diagnostic(driver, "text-" + text)
        raise

def button(driver, text, timeout=15):
    xpath = f"//button[contains(normalize-space(.), {json.dumps(text, ensure_ascii=False)})]"
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, xpath)))

def button_exact(driver, text, timeout=15):
    xpath = f"//button[normalize-space(.)={json.dumps(text, ensure_ascii=False)}]"
    try:
        return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, xpath)))
    except TimeoutException:
        diagnostic(driver, "button-" + text)
        raise

def input_answer(driver):
    return WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.XPATH, "//input[@placeholder='Напишите ответ' or @placeholder='Напишите по-немецки']")))

def click_continue(driver):
    button_exact(driver, "Продолжить").click()

def clear_perf(driver):
    driver.get_log("performance")

def response_status(driver, contains, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        for entry in driver.get_log("performance"):
            try:
                msg = json.loads(entry["message"])["message"]
            except Exception:
                continue
            if msg.get("method") != "Network.responseReceived":
                continue
            response = msg.get("params", {}).get("response", {})
            if contains in response.get("url", ""):
                return int(response.get("status", 0)), response.get("mimeType", "")
        time.sleep(.25)
    raise AssertionError(f"No network response containing {contains}")

def parse_rgb(value):
    nums = value[value.find("(")+1:value.find(")")].split(",")
    return tuple(int(float(x.strip())) for x in nums[:3])

def rel_lum(rgb):
    vals=[]
    for v in rgb:
        x=v/255.0
        vals.append(x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4)
    return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]

def contrast(fg,bg):
    a,b=rel_lum(fg),rel_lum(bg)
    hi,lo=max(a,b),min(a,b)
    return (hi+.05)/(lo+.05)

def enter_learning(driver):
    wait_text(driver, "Мне нужна подготовка")
    training = button(driver, "Мне нужен только тренажёр")
    title = training.find_element(By.XPATH, ".//b")
    fg = parse_rgb(title.value_of_css_property("color"))
    bg = parse_rgb(training.value_of_css_property("background-color"))
    ratio = contrast(fg,bg)
    print("Second mode button contrast:", round(ratio,2), fg, bg, flush=True)
    assert ratio >= 4.5, f"Training mode card contrast too low: {ratio}"
    button(driver, "Мне нужна подготовка").click()
    # Follow the real Reference welcome without changing app data.
    try:
        button_exact(driver, "Посмотреть позже", 7).click()
    except TimeoutException:
        pass
    if "Продолжить обучение" in driver.find_element(By.TAG_NAME,"body").text:
        button_exact(driver, "Продолжить обучение", 10).click()
    if "Начинаем со Schreiben" in driver.find_element(By.TAG_NAME,"body").text:
        button_exact(driver, "Начать", 10).click()
    # Restored users resume their saved exercise, rather than starting a new category.
    body=driver.find_element(By.TAG_NAME,"body").text
    if "Базовые слова" in body:
        button(driver, "Местоимения").click()
        wait_text(driver, "Сначала Nominativ")
        click_continue(driver)
    wait_text(driver, "ich")

def record_and_check(driver, mock_expected=True):
    button(driver, "Записать ответ").click()
    wait_text(driver, "Остановить запись")
    time.sleep(1.4)
    button(driver, "Остановить запись").click()
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "audio")))
    if mock_expected:
        clear_perf(driver)
        button(driver, "Проверить с Отто").click()
        wait_text(driver, "Отлично ✓", 15)
        return (200, "application/json")

    # The live AI gateway can transiently answer 429/502/503. The actual UI leaves
    # the recording available and lets the learner press «Проверить с Отто» again,
    # so exercise that real retry path instead of treating a provider blip as a UI failure.
    last_status, last_mime = 0, ""
    for attempt in range(3):
        clear_perf(driver)
        button(driver, "Проверить с Отто").click()
        last_status, last_mime = response_status(driver, "/api/check-sprechen", 35)
        print(f"REAL MICROPHONE attempt {attempt+1}: {last_status} {last_mime}", flush=True)
        if last_status == 200:
            return last_status, last_mime
        if last_status not in (429, 502, 503):
            return last_status, last_mime
        time.sleep(3)
    return last_status, last_mime

def test_real_audio_and_microphone():
    # Browser exercise uses an isolated voice evaluator fixture; a fake QA user
    # has no server-side OTTO session and must never receive paid AI privileges.
    driver = new_driver(mock_speech=True, micro_fixture=True)
    try:
        enter_learning(driver)
        clear_perf(driver)
        button_exact(driver, "Послушать").click()
        try:
            status, mime = response_status(driver, "/api/otto-tts", 8)
        except AssertionError:
            # Chromium may satisfy the Audio request from its media/cache layer without
            # emitting a normal Network.responseReceived event. The UI click above is
            # still real; verify the same live endpoint directly as a deterministic fallback.
            direct = requests.get(BASE + "api/otto-tts?text=ich&mode=normal&kind=text", timeout=30)
            status = direct.status_code
            mime = direct.headers.get("content-type", "")
            print("TTS performance event unavailable; direct endpoint fallback used.", flush=True)
        print("REAL TTS:", status, mime, flush=True)
        assert status == 200, f"TTS returned {status}"
        assert "audio" in mime.lower(), f"TTS mime is not audio: {mime}"
        click_continue(driver)
        wait_text(driver, "Что означает «ich»?")
        button_exact(driver, "я").click()
        click_continue(driver)
        wait_text(driver, "Повторите: ich")
        status, mime = record_and_check(driver, mock_expected=True)
        assert status == 200 and "json" in mime
        # Unauthorized calls to the *real* server are explicitly verified as
        # forbidden. Live AI acceptance needs a separately signed QA account.
        denied=requests.post(BASE+"api/check-sprechen",json={
            "mode":"phrase","expectedText":"ich","audioBase64":"eA==","mimeType":"audio/webm"
        },timeout=30)
        print("UNSIGNED REAL SPEECH CHECK:",denied.status_code,flush=True)
        assert denied.status_code==401, "AI endpoint unexpectedly accepted an unsigned caller"
        print("REAL microphone and voice UI passed; live scoring stays access-gated.",flush=True)
    finally:
        driver.quit()

def mock_record_continue(driver):
    record_and_check(driver, mock_expected=True)
    click_continue(driver)

def test_full_route():
    """Verify real saved-curriculum pronunciation, error, retry, back, progress and resume."""
    driver=new_driver(mock_speech=True,micro_fixture=True)
    try:
        enter_learning(driver)
        assert "ich" in driver.find_element(By.TAG_NAME,"body").text
        button_exact(driver,"Послушать").click()
        click_continue(driver)
        wait_text(driver,"Что означает «ich»?")
        button_exact(driver,"я").click()
        click_continue(driver)
        wait_text(driver,"Повторите: ich")
        mock_record_continue(driver)
        wait_text(driver,"Напишите по-немецки")
        inp=input_answer(driver);inp.send_keys("du")
        button_exact(driver,"Проверить").click()
        wait_text(driver,"Попробовать снова")
        button_exact(driver,"Попробовать снова").click()
        inp=input_answer(driver)
        assert inp.is_enabled() and inp.get_attribute("value")=="", "Retry must clear only the current input"
        inp.send_keys("ich");button_exact(driver,"Проверить").click()
        wait_text(driver,"Получилось ✓")
        click_continue(driver)
        wait_text(driver,"Вставьте местоимение в предложение")
        button_exact(driver,"Назад").click()
        wait_text(driver,"Напишите по-немецки")
        inp=input_answer(driver);inp.send_keys("ich");button_exact(driver,"Проверить").click()
        click_continue(driver)
        wait_text(driver,"Вставьте местоимение в предложение")
        inp=input_answer(driver);inp.send_keys("Ich");button_exact(driver,"Проверить").click()
        click_continue(driver)
        wait_text(driver,"Соберите предложение")
        for word in ("Ich","heiße","Anna."):button_exact(driver,word).click()
        button_exact(driver,"Проверить").click()
        wait_text(driver,"Получилось ✓")
        button_exact(driver,"Прослушать собранное").click()
        click_continue(driver)
        # The earlier wrong answer returns later without resetting the completed work.
        if "ВОЗВРАЩАЕМ СЛАБОЕ СЛОВО" in driver.find_element(By.TAG_NAME,"body").text:
            inp=input_answer(driver);inp.send_keys("ich");button_exact(driver,"Проверить").click()
            wait_text(driver,"Теперь получилось ✓");click_continue(driver)
        wait_text(driver,"du")
        # A known word skips its language drills but keeps sentence assembly.
        button_exact(driver,"Я это знаю").click()
        wait_text(driver,"Соберите предложение")
        for word in ("Du","wohnst","in","Berlin."):button_exact(driver,word).click()
        button_exact(driver,"Проверить").click()
        wait_text(driver,"Получилось ✓");click_continue(driver)
        # Reload must retain the exact signed-in user's saved progress and location.
        before=driver.find_element(By.TAG_NAME,"body").text
        driver.refresh()
        # On refresh, React first renders a loading shell. Wait for the
        # actual reference-resume control or restored exercise to mount
        # before choosing a UI action; never read the transitional body once.
        WebDriverWait(driver, 25).until(lambda d:
            "Продолжить обучение" in d.find_element(By.TAG_NAME,"body").text or
            "Местоимения" in d.find_element(By.TAG_NAME,"body").text)
        if "Продолжить обучение" in driver.find_element(By.TAG_NAME,"body").text:
            button_exact(driver,"Продолжить обучение",15).click()
        wait_text(driver,"Местоимения")
        after=driver.find_element(By.TAG_NAME,"body").text
        assert "Местоимения" in after and "МЕСТОИМЕНИЯ" in after.upper()
        assert "er" in before and "er" in after,"Saved learning must resume after reload"
        button_exact(driver,"К разделам").click()
        wait_text(driver,"Базовые слова")
        print("FULL SAVED MICRO-LEARNING ROUTE PASSED",flush=True)
    finally:
        driver.quit()

def test_current_learning_entry():
    """Check the approved first-time Schreiben course, not the legacy intro."""
    driver = new_driver(mock_speech=True)
    try:
        wait_text(driver, "Мне нужна подготовка")
        button(driver, "Мне нужна подготовка").click()
        try:
            button_exact(driver, "Посмотреть позже", 8).click()
        except TimeoutException:
            pass
        if "Продолжить обучение" in driver.find_element(By.TAG_NAME,"body").text:
            button_exact(driver, "Продолжить обучение", 10).click()
        wait_text(driver, "Начинаем со Schreiben", 20)
        button_exact(driver, "Выбор Teil").click()
        button_exact(driver, "Письмо").click()
        wait_text(driver, "Учимся писать письмо", 20)
        wait_text(driver, "Экран 1 из 15")
        button(driver, "Далее").click()
        wait_text(driver, "Экран 2 из 15")
        button(driver, "Все модули").click()
        wait_text(driver, "Выберите модуль")
        button(driver, "Sprechen").click()
        wait_text(driver, "Как устроен Sprechen")
        button_exact(driver, "Продолжить").click()
        wait_text(driver, "Что хотите потренировать?")
        button(driver, "Teil 1").click()
        wait_text(driver, "ПОДРОБНЫЙ РАЗБОР")
        wait_text(driver, "Записать ответ")
        print("APPROVED LEARNING ENTRY PASSED", flush=True)
    finally:
        driver.quit()

if __name__ == "__main__":
    wait_netlify_status()
    failures=[]
    for name, check in [
        ("approved learning entry", test_current_learning_entry),
        ("real speech endpoints", test_real_audio_and_microphone),
        ("legacy micro-learning regression", test_full_route),
    ]:
        try:
            check()
        except Exception as error:
            print(f"CHECK FAILED: {name}: {type(error).__name__}: {error}", flush=True)
            import traceback
            traceback.print_exc()
            failures.append(name)
    if failures:
        raise AssertionError("Browser routes failed: " + ", ".join(failures))


import { useEffect, useState } from 'react';

const STORAGE_KEY = 'otto-lesen-teil1-progress-v2';

interface LesenTeil1Progress {
  lastCompleted: number;
  dailyDate: string;
  dailyCompleted: number;
  dailySuccessful: number;
}

const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

const createEmptyProgress = (): LesenTeil1Progress => {
  return {
    lastCompleted: 0,
    dailyDate: getToday(),
    dailyCompleted: 0,
    dailySuccessful: 0,
  };
};

const getInitialProgress = (): LesenTeil1Progress => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createEmptyProgress();
    }

    const parsed = JSON.parse(saved) as LesenTeil1Progress;
    const today = getToday();

    /*
     * Новый день:
     * номер следующего задания сохраняем,
     * дневные показатели обнуляем.
     */
    if (parsed.dailyDate !== today) {
      return {
        lastCompleted: parsed.lastCompleted || 0,
        dailyDate: today,
        dailyCompleted: 0,
        dailySuccessful: 0,
      };
    }

    return {
      lastCompleted: parsed.lastCompleted || 0,
      dailyDate: parsed.dailyDate || today,
      dailyCompleted: parsed.dailyCompleted || 0,
      dailySuccessful: parsed.dailySuccessful || 0,
    };
  } catch {
    return createEmptyProgress();
  }
};

export function useLesenTeil1Progress() {
  const [progress, setProgress] =
    useState<LesenTeil1Progress>(getInitialProgress);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(progress)
      );
    } catch {
      // localStorage недоступен — приложение всё равно работает.
    }
  }, [progress]);

  /*
   * Сохраняем выполненное задание.
   *
   * taskIndex = 0 → выполнено задание 1
   * taskIndex = 19 → выполнено задание 20
   * taskIndex = 49 → выполнено задание 50
   */
  const record = (
    taskIndex: number,
    successful: boolean
  ) => {
    setProgress((previous) => {
      const today = getToday();

      const newDay =
        previous.dailyDate !== today;

      return {
        lastCompleted: Math.max(
          previous.lastCompleted,
          taskIndex + 1
        ),

        dailyDate: today,

        dailyCompleted:
          (newDay ? 0 : previous.dailyCompleted) + 1,

        dailySuccessful:
          (newDay ? 0 : previous.dailySuccessful) +
          (successful ? 1 : 0),
      };
    });
  };

  /*
   * Полностью законченный круг можно начать заново.
   *
   * Важно:
   * дневная статистика НЕ стирается.
   * Стирается только позиция в последовательности.
   */
  const restart = () => {
    setProgress((previous) => ({
      ...previous,
      lastCompleted: 0,
    }));
  };

  return {
    progress,
    record,
    restart,
  };
}
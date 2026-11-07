#!/usr/bin/env python3
"""Fetch OTTO B1 original ZIPs from user-controlled private HTTPS URLs.

URLs are passed exclusively via GitHub Actions secrets. Never print them.
No file is uploaded to a public GitHub release or committed to git.
"""
import argparse
import os
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from zipfile import ZipFile, BadZipFile

MAX_BYTES = 550 * 1024 * 1024
FILES = ('HT3.zip', 'HT4.zip', 'ST3.zip')

def retrieve(name: str, destination: Path):
    url = os.environ.get('B1_AUDIO_' + name[:3].upper() + '_URL', '')
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Missing or invalid private HTTPS URL for ' + name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix('.download')
    try:
        request = Request(url, headers={'User-Agent': 'OTTO-B1-private-audio-import/1'})
        try:
            response = urlopen(request, timeout=90)
        except Exception:
            # HTTPError can contain the complete presigned URL. Never log it.
            raise RuntimeError('Private source download failed for ' + name) from None
        with response, temp.open('wb') as output:
            if urlsplit(response.geturl()).scheme != 'https':
                raise ValueError('Source redirected to insecure transport: ' + name)
            size = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ValueError('Archive exceeds size limit: ' + name)
                output.write(chunk)
        with ZipFile(temp) as archive:
            if archive.testzip() is not None:
                raise BadZipFile('ZIP CRC failed: ' + name)
            recordings = sum(x.filename.lower().endswith('.mp3') for x in archive.infolist())
            if recordings < 1:
                raise ValueError('Archive has no MP3: ' + name)
        temp.replace(destination)
        print('Validated private B1 source',name,'MP3 count:',recordings,'bytes:',size)
    finally:
        temp.unlink(missing_ok=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    for file in FILES:
        try:
            retrieve(file, args.out / file)
        except Exception:
            # Prevent URL leaks through underlying exception tracebacks.
            raise RuntimeError('Private source validation failed for ' + file) from None

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Build missing B1 JSONL audio bundles from user-provided ZIPs.
No synthetic audio: each index entry must have a real MP3 in the source archives.
"""
import argparse
import base64
import json
import zipfile
from collections import defaultdict
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, default=Path('public-b1/b1/audio-index.json'))
    parser.add_argument('--output', type=Path, default=Path('public-b1/b1/audio-packs'))
    parser.add_argument('archives', nargs='+', type=Path)
    args = parser.parse_args()
    index = json.loads(args.manifest.read_text(encoding='utf-8'))
    if len(index) != 599:
        raise ValueError(f'Expected 599 original recordings, found {len(index)}')
    lookup = {}
    opened = []
    try:
        for path in args.archives:
            zf = zipfile.ZipFile(path)
            opened.append(zf)
            for member in zf.namelist():
                if not member.lower().endswith('.mp3'):
                    continue
                name = Path(member).name
                if name in lookup:
                    raise ValueError(f'Duplicate MP3 name: {name}')
                lookup[name] = (zf, member)
        grouped = defaultdict(list)
        for stem, pack in index.items():
            name = stem + '.mp3'
            if name not in lookup:
                raise FileNotFoundError(f'Original audio missing: {name}')
            if not isinstance(pack, int) or pack < 0:
                raise ValueError(f'Invalid pack for {name}: {pack}')
            grouped[pack].append(name)
        args.output.mkdir(parents=True, exist_ok=True)
        created = 0
        for pack, names in sorted(grouped.items()):
            if pack == 0:
                continue
            out = args.output / f'bundle-{pack:03}.jsonl'
            if out.exists():
                continue
            temp = out.with_suffix(out.suffix + '.tmp')
            with temp.open('w', encoding='utf-8') as stream:
                for name in names:
                    zf, member = lookup[name]
                    audio = zf.read(member)
                    if not audio:
                        raise ValueError(f'Empty source MP3: {name}')
                    stream.write(json.dumps({'name': name, 'b64': base64.b64encode(audio).decode('ascii')}, separators=(',', ':')) + '\n')
            temp.replace(out)
            created += 1
        print(f'Created {created} missing audio packages for {len(index)} indexed recordings.')
    finally:
        for zf in opened:
            zf.close()


if __name__ == '__main__':
    main()

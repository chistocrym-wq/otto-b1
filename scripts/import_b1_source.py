#!/usr/bin/env python3
"""Stage Goethe B1 source documents for editorial import.

Usage: python scripts/import_b1_source.py input.zip --out build/b1-source
Requires: python-docx. Does NOT modify OTTO A1 or publish content.
Output contains answer keys/transcripts: keep it server-side until visibility rules are implemented.
"""
import argparse
import io
import json
import re
import zipfile
from pathlib import Path
from docx import Document

SECTIONS = {"HOREN": 4, "LESEN": 5, "SCHRIEBEN": 3, "SPRECHEN": 3}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("--out", type=Path, default=Path("build/b1-source"))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = []
    with zipfile.ZipFile(args.archive) as archive:
        for name in sorted(archive.namelist()):
            if not name.lower().endswith(".docx"):
                continue
            parts = Path(name).parts
            section = next((part for part in parts if part.upper() in SECTIONS), None)
            teil = next((part for part in parts if re.fullmatch(r"TEIL [1-9]", part.upper())), None)
            if not section or not teil:
                raise ValueError(f"Unknown B1 section or Teil: {name}")
            number = int(teil.split()[1])
            if number > SECTIONS[section]:
                raise ValueError(f"Unexpected Teil: {name}")
            doc = Document(io.BytesIO(archive.read(name)))
            # Preserve original paragraph order, including empty paragraphs for auditing.
            paragraphs = [p.text for p in doc.paragraphs]
            if doc.tables:
                raise ValueError(f"Tables require dedicated editorial handling: {name}")
            code = f"{section.lower()}-teil-{number}"
            output = {
                "schemaVersion": 1,
                "section": section,
                "teil": number,
                "sourceDocument": name,
                "status": "raw-editorial-not-for-client",
                "paragraphs": paragraphs,
            }
            target = args.out / f"{code}.json"
            target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
            manifest.append({"section": section, "teil": number, "paragraphCount": len(paragraphs), "file": target.name})
    if len(manifest) != 15:
        raise ValueError(f"Expected 15 source documents, found {len(manifest)}")
    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Staged {len(manifest)} B1 source documents in {args.out}")
    print("NOTE: This is NOT a student-ready import; correct answers and transcripts must remain hidden before submission.")

if __name__ == "__main__":
    main()

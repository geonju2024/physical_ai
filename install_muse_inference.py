#!/usr/bin/env python3
# coding: utf-8
"""Safely install Stitch Inference Engine into the existing MUSE static website.
Runs locally on the user's MUSE repository; no dependencies beyond Python 3.9+.
"""
import argparse
import datetime
import pathlib
import re
import shutil
import sys

SITE_PAGES = ('index.html', 'ai-research.html', 'data-pipeline.html', 'hardware.html')
NEW_PAGE = 'inference-engine.html'


def patch_header(html, page):
    if 'href="./inference-engine.html"' in html and 'Inference Engine</a>' in html and page == 'data-pipeline.html':
        pass  # Already present; only add other missing links if any.
    header = re.search(r'<header\b[^>]*>[\s\S]*?</header>', html, flags=re.I)
    if not header:
        raise ValueError(f'{page}: 헤더를 찾지 못했습니다.')
    old = header.group(0)
    anchors = list(re.finditer(r'<a\b[^>]*\bhref=["\'](?:\./)?hardware\.html["\'][^>]*>\s*Hardware\s*</a>', old, flags=re.I))
    if not anchors:
        raise ValueError(f'{page}: Hardware 메뉴 위치를 찾지 못했습니다.')
    new = old
    for item in reversed(anchors):
        # If already inserted immediately after the hardware link, don't duplicate.
        tail = new[item.end(): item.end()+450]
        if re.match(r'\s*<a\b[^>]*href=["\'](?:\./)?inference-engine\.html["\'][^>]*>\s*Inference Engine\s*</a>',tail,flags=re.I):
            continue
        if page == 'index.html':
            cls = 'text-on-surface-variant hover:text-secondary transition-colors pb-1' if len(anchors)==1 or item.start()==anchors[0].start() else 'text-on-surface-variant hover:text-secondary transition-colors'
            link = f'<a class="{cls}" href="./inference-engine.html">Inference Engine</a>'
        elif page == 'ai-research.html':
            cls = 'text-on-surface-variant hover:text-secondary font-title-editorial text-sm transition-colors' if item.start()==anchors[0].start() else 'text-on-surface-variant hover:text-secondary transition-colors'
            link = f'<a class="{cls}" href="./inference-engine.html">Inference Engine</a>'
        elif page == 'hardware.html':
            if item.start()==anchors[0].start():
                cls = 'text-on-surface-variant dark:text-surface-variant font-label-uppercase text-label-uppercase tracking-wider transition-colors hover:text-secondary dark:hover:text-secondary-fixed'
                link = f'<a class="{cls}" href="./inference-engine.html">Inference Engine</a>'
            else:
                link = '<a href="./inference-engine.html">Inference Engine</a>'
        else:
            link = '<a href="./inference-engine.html">Inference Engine</a>'
        eol = '\r\n' if '\r\n' in html else '\n'
        new = new[:item.end()] + eol + link + new[item.end():]
    return html[:header.start()] + new + html[header.end():]


def patch_footer(html, page):
    foot = re.search(r'<footer\b[^>]*>[\s\S]*?</footer>', html, flags=re.I)
    if not foot:
        return html
    old = foot.group(0)
    if re.search(r'href=["\'](?:\./)?inference-engine\.html["\']', old):
        return html
    candidates = [r'<a\b[^>]*href=["\'](?:\./)?data-pipeline\.html["\'][^>]*>[\s\S]*?</a>',
                  r'<a\b[^>]*href=["\'](?:\./)?ai-research\.html(?:#privacy)?["\'][^>]*>[\s\S]*?</a>']
    target = None
    for pat in candidates:
        anchors = list(re.finditer(pat, old, flags=re.I))
        if anchors:
            target = anchors[-1]
            break
    if not target:
        return html
    last = target.group(0)
    cls = re.search(r'class=["\']([^"\']+)["\']', last)
    klass = f' class="{cls.group(1)}"' if cls else ''
    added = f'<a{klass} href="./inference-engine.html">Inference Engine</a>'
    eol = '\r\n' if '\r\n' in html else '\n'
    new = old[:target.end()] + eol + added + old[target.end():]
    return html[:foot.start()] + new + html[foot.end():]


def validate(target):
    expected = [*SITE_PAGES, NEW_PAGE]
    for name in expected:
        if not (target / name).is_file():
            raise ValueError(f'필수 파일 없음: {name}')
        data = (target / name).read_bytes().decode('utf-8-sig')
        if name != NEW_PAGE and 'inference-engine.html' not in data:
            raise ValueError(f'링크 누락: {name}')
        if name == NEW_PAGE:
            for path in SITE_PAGES:
                if './'+path not in data:
                    raise ValueError(f'신규 페이지에서 {path}로 가는 링크 누락')
            if not re.search(r'id=["\']muse-inference-mobile-nav["\']',data):
                raise ValueError('신규 페이지 모바일 메뉴 누락')
    return True


def main():
    parser = argparse.ArgumentParser(description='MUSE Inference Engine 안전 통합 설치')
    parser.add_argument('--root', default='.', help='MUSE 홈페이지 저장소 경로 (기본: 현재 폴더)')
    parser.add_argument('--dry-run',action='store_true',help='실제 변경 없이 점검만 수행')
    parser.add_argument('--allow-other-branch',action='store_true',help='muse-mvp-integration 이외 브랜치에서도 실행 허용')
    args = parser.parse_args()
    root = pathlib.Path(args.root).expanduser().resolve()
    source = pathlib.Path(__file__).resolve().parent / NEW_PAGE
    if not source.is_file():
        sys.exit('실패: 패키지에 inference-engine.html 파일이 없습니다.')
    missing = [p for p in SITE_PAGES if not (root/p).is_file()]
    if missing:
        sys.exit('실패: 기존 홈페이지 파일이 부족합니다: '+', '.join(missing)+'\n현재 브랜치와 --root 경로를 확인해 주세요.')
    # Important: never force a checkout or discard local staged/untracked work.
    branch = None
    try:
        import subprocess
        res = subprocess.run(['git','-C',str(root),'branch','--show-current'],capture_output=True,text=True,check=False)
        branch=res.stdout.strip() or None
    except Exception:
        pass
    if branch and branch != 'muse-mvp-integration' and not args.allow_other_branch:
        sys.exit(f'중단: 현재 브랜치는 {branch} 입니다. 권장 브랜치 muse-mvp-integration에서 실행하세요.\n다른 브랜치에서 설치하려면 --allow-other-branch 옵션을 지정해야 합니다.')
    modified = {}
    for name in SITE_PAGES:
        old=(root/name).read_bytes().decode('utf-8-sig')
        new=patch_header(old,name)
        new=patch_footer(new,name)
        modified[name]=(old,new)
    new_page_content=source.read_text(encoding='utf-8')
    dest=root/NEW_PAGE
    prev=dest.read_bytes().decode('utf-8-sig') if dest.exists() else None
    n_changes=sum(old!=new for old,new in modified.values())+int(prev!=new_page_content)
    print(f'대상: {root}\n브랜치: {branch or "확인 불가"}\n수정/추가할 파일: {n_changes}개')
    for p,(old,new) in modified.items():
        print('  '+ ('수정 ' if old!=new else '유지 ') +p)
    print('  '+ ('수정 ' if prev is not None else '추가 ') +NEW_PAGE if prev!=new_page_content else '  유지 '+NEW_PAGE)
    if args.dry_run:
        print('DRY RUN: 파일을 변경하지 않았습니다.')
        return
    if not n_changes:
        print('이미 설치되어 있습니다. 재설치하지 않았습니다.')
        validate(root)
        return
    bak=root/'.muse-backups'/('inference-engine-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
    bak.mkdir(parents=True,exist_ok=False)
    for p,(old,new) in modified.items():
        if old!=new:
            shutil.copy2(root/p,bak/p)
    if prev is not None and prev!=new_page_content:
        shutil.copy2(dest,bak/NEW_PAGE)
    try:
        for p,(old,new) in modified.items():
            if old!=new: (root/p).write_bytes(new.encode('utf-8'))
        if prev!=new_page_content: dest.write_bytes(new_page_content.encode('utf-8'))
        validate(root)
    except Exception:
        for p in SITE_PAGES:
            if (bak/p).exists(): shutil.copy2(bak/p,root/p)
        if (bak/NEW_PAGE).exists(): shutil.copy2(bak/NEW_PAGE,dest)
        elif prev is None and dest.exists(): dest.unlink()
        raise
    print('\n연결 완료. 원본 백업: '+str(bak))
    print('확인: python -m http.server 8000 -> http://localhost:8000/inference-engine.html')
    print('Git commit / push는 자동으로 수행하지 않습니다.')

if __name__ == '__main__':
    main()

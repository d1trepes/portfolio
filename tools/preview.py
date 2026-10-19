"""Собирает из dist/ один самодостаточный HTML для предпросмотра в артефакте Claude.
Запуск: npm run build && python3 tools/preview.py  →  preview/index.html
Шрифты берутся только кириллица + латиница woff2, картинки и скрипты встраиваются.
Страницы кейсов превращаются в всплывающие экраны (#case-<id>), т.к. в артефакте нет отдельных адресов."""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.join(ROOT, 'preview')


def b64(path, mime):
    with open(path, 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()


def dist(p):
    return os.path.join(DIST, p.lstrip('/'))


def inline_css(css):
    # @font-face: оставляем только cyrillic и latin (woff2), остальное выкидываем
    def face(m):
        block = m.group(0)
        if not re.search(r'-(cyrillic|latin)-\d', block):
            return ''
        w2 = re.search(r'url\((/_astro/[^)]+\.woff2)\)', block)
        if not w2:
            return ''
        block = re.sub(r'src:[^;}]+', f'src:url({b64(dist(w2.group(1)), "font/woff2")}) format("woff2")', block)
        return block
    css = re.sub(r'@font-face\{[^}]*\}', face, css)
    css = re.sub(r'url\((/hero/[^)]+\.webp)\)', lambda m: f'url({b64(dist(m.group(1)), "image/webp")})', css)
    return css


html = open(dist('index.html'), encoding='utf-8').read()

# стили
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: '<style>' + inline_css(open(dist(m.group(1)), encoding='utf-8').read()) + '</style>', html)
html = re.sub(r'<link rel="preload"[^>]*>', '', html)

# скрипты-модули
html = re.sub(r'<script type="module" src="([^"]+)"></script>',
              lambda m: '<script type="module">' + open(dist(m.group(1)), encoding='utf-8').read() + '</script>', html)

# картинки (в html и в скриптах)
for name in ('portrait', 'mesh', 'sil', 'sild'):
    html = html.replace(f'/hero/{name}.webp', b64(dist(f'hero/{name}.webp'), 'image/webp'))

# кейсы и страница «Все проекты» → всплывающие экраны (#case-<id>, #projects)
index_links = set(re.findall(r'<link rel="stylesheet" href="([^"]+)">', open(dist('index.html'), encoding='utf-8').read()))
pids = sorted(d for d in os.listdir(dist('projects')) if os.path.isdir(dist(f'projects/{d}')))
pops, extra_css = [], []
for pid in pids:
    page = open(dist(f'projects/{pid}/index.html'), encoding='utf-8').read()
    main = re.search(r'<main.*?</main>', page, re.S).group(0)
    pops.append(f'<div class="case-pop" id="case-{pid}">{main}</div>')
case_page = open(dist(f'projects/{pids[0]}/index.html'), encoding='utf-8').read()
extra_css += [c for c in re.findall(r'<style>(.*?)</style>', case_page, re.S) if 'case-stub' in c]

all_page = open(dist('projects/index.html'), encoding='utf-8').read()
main = re.search(r'<main.*?</main>', all_page, re.S).group(0)
pops.append(f'<div class="case-pop" id="projects">{main}</div>')
for href in re.findall(r'<link rel="stylesheet" href="([^"]+)">', all_page):
    if href not in index_links:
        extra_css.append(inline_css(open(dist(href), encoding='utf-8').read()))
extra_css += [c for c in re.findall(r'<style>(.*?)</style>', all_page, re.S) if '.ap' in c or '.pj' in c]

html = html.replace('</body>', '<style>.case-pop{display:none;position:fixed;inset:0;z-index:90;background:var(--bg);overflow:auto}.case-pop:target{display:block}'
                    + ''.join(extra_css) + '</style>' + ''.join(pops) + '</body>')
for pid in pids:
    html = html.replace(f'href="/projects/{pid}/"', f'href="#case-{pid}"')
html = html.replace('href="/projects/"', 'href="#projects"')

html = html.replace('href="/#featured"', 'href="#featured"').replace('href="/"', 'href="#"')
html = re.sub(r'<title>.*?</title>', '<title>Сайт Ивана Засадыча</title>', html, count=1)

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
print('preview/index.html', round(len(html) / 1024), 'KB')

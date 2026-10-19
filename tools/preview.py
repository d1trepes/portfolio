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
    css = re.sub(r'url\((/(?:hero|footer)/[^)]+\.webp)\)', lambda m: f'url({b64(dist(m.group(1)), "image/webp")})', css)
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
for name in ('eye', 'eye-lines'):
    html = html.replace(f'/footer/{name}.webp', b64(dist(f'footer/{name}.webp'), 'image/webp'))

# кейсы → всплывающие экраны
cases = []
for pid in sorted(os.listdir(dist('projects'))):
    page = open(dist(f'projects/{pid}/index.html'), encoding='utf-8').read()
    main = re.search(r'<main.*?</main>', page, re.S).group(0)
    main = main.replace('href="/#featured"', 'href="#featured"')
    cases.append(f'<div class="case-pop" id="case-{pid}">{main}</div>')
    html = html.replace(f'href="/projects/{pid}/"', f'href="#case-{pid}"')
case_css = re.findall(r'<style>(.*?)</style>', open(dist(f'projects/{pid}/index.html'), encoding='utf-8').read(), re.S)
case_css = [c for c in case_css if 'case-stub' in c]
html = html.replace('</body>', '<style>.case-pop{display:none;position:fixed;inset:0;z-index:90;background:var(--bg);overflow:auto}.case-pop:target{display:block}'
                    + ''.join(case_css) + '</style>' + ''.join(cases) + '</body>')

html = html.replace('href="/#featured"', 'href="#featured"').replace('href="/#about"', 'href="#about"').replace('href="/#contact"', 'href="#contact"').replace('href="/"', 'href="#"')
html = re.sub(r'<title>.*?</title>', '<title>Сайт Ивана Засадыча</title>', html, count=1)

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
print('preview/index.html', round(len(html) / 1024), 'KB')

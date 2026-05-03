path = 'src/pages/DataSourcesPage/DataSourcesPage.tsx'
content = open(path).read()

old = """    if (!jobName) {
      const name = file.name.replace(/\\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setJobName(name);
    }"""

new = """    if (!jobName.trim()) {
      const name = file.name.replace(/\\.[^/.]+$/, '');
      setJobName(name);
    }"""

if old in content:
    content = content.replace(old, new)
    open(path, 'w').write(content)
    print('Done — auto-fill now preserves filename as-is')
else:
    # Find the actual auto-fill block
    idx = content.find('setJobName(name)')
    if idx >= 0:
        print('Found setJobName at:', idx)
        print(repr(content[max(0,idx-150):idx+50]))
    else:
        print('setJobName(name) not found at all')

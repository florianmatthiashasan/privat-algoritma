export function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const jsonDownload = (name, object) => download(name, JSON.stringify(object, null, 2), 'application/json')

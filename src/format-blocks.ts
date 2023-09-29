import jsdom from 'jsdom'

export const formatImgSrc = (htmlString: string, baseUrl: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const imgElements = document.querySelectorAll('img')
  imgElements.forEach((imgElement: HTMLImageElement) => {
    const currentSrc = imgElement.getAttribute('src')
    if (currentSrc) {
      imgElement.setAttribute('src', baseUrl + currentSrc)
    }
  })
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

export const formatSitenameBlock = (htmlString: string, selector: string, sitename: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const sitenameLink = document.querySelector(selector)
  if (sitenameLink) sitenameLink.textContent = sitename
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

export const formatLocaleLinkBlock = (htmlString: string, selector: string, localeText: string, linkUrl: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const localeLink = document.querySelector(selector) as HTMLAnchorElement
  const url = new URL(linkUrl)
  const langParam = url.searchParams.get('l')
  url.searchParams.set('l', langParam === 'en' ? 'sv' : 'en')
  if (localeLink) {
    localeLink.textContent = localeText
    localeLink.href = url.toString()
  }
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

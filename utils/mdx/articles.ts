import glob from 'fast-glob'

interface Academy {
  title: string
  description: string
  author: string
  date: string
}

export interface AcademyWithSlug extends Academy {
  slug: string
}

async function importAcademy(
  articleFilename: string,
): Promise<AcademyWithSlug> {
  let { article } = (await import(`../app/academy/${articleFilename}`)) as {
    default: React.ComponentType
    article: Academy
  }

  return {
    slug: articleFilename.replace(/(\/page)?\.mdx$/, ''),
    ...article,
  }
}

export async function getAllAcademy() {
  let articleFilenames = await glob('*/page.mdx', {
    cwd: './src/app/academy',
  })

  let articles = await Promise.all(articleFilenames.map(importAcademy))

  return articles.sort((a, z) => +new Date(z.date) - +new Date(a.date))
}

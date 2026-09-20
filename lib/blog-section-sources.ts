export const blogSectionSourceUrls: Record<string, Record<string, string[]>> = {
  'markaz-al-osairat': {
    where: [
      'https://www.sohag.gov.eg/gov2/division/marakez_display%281%29.aspx?ID=5',
    ],
    villages: [
      'https://www.sohag.gov.eg/gov2/division/marakez_display%281%29.aspx?ID=5',
    ],
    'administrative-history': [
      'https://gate.ahram.org.eg/daily/NewsPrint/624507.aspx',
    ],
    population: [
      'https://old.capmas.gov.eg/Admin/Pages%20Files/20251127114135%D8%AA%D9%82%D8%AF%D9%8A%D8%B1%20%D8%A7%D9%84%D8%B3%D9%83%D8%A7%D9%86%20%D9%84%D8%A7%D9%82%D8%B3%D8%A7%D9%85%20%D9%88%D9%85%D8%B1%D8%A7%D9%83%D8%B2%20%D8%AC%D9%85%D9%87%D9%88%D8%B1%D9%8A%D8%A9%20%D9%85%D8%B5%D8%B1%20%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9.pdf',
    ],
    'services-development': [
      'https://mped.gov.eg/singlenews?id=6514',
    ],
  },
  'al-osairat-landmarks': {
    'virgin-church': [
      'https://gate.ahram.org.eg/daily/NewsPrint/607640.aspx',
    ],
    alnoor: [
      'https://www.masrawy.com/news/news_regions/details/2017/6/30/1112550/',
    ],
    alfath: [
      'https://ar.awkafonline.com/?p=193912',
    ],
    railway: [
      'https://www.alwafd.news/2055830',
      'https://www.elwatannews.com/news/details/5063697',
    ],
    hospital: [
      'https://www.youm7.com/story/2024/8/24/النيابة-الإدارية-تحقق-فى-مخالفات-مستشفى-العسيرات-المركزى-بسوهاج/6684503',
    ],
  },
  'al-osairat-famous-people': {
    sharkawy: [
      'https://www.dostor.org/5514174',
      'https://azhar.eg/',
    ],
    'esmat-radwan': [
      'https://journals.ekb.eg/article_373827_0.html',
    ],
    aburehab: [
      'https://www.rosaelyoussef.com/116692',
    ],
    ramly: [
      'https://www.khbarbladi.com/theme_vstpart-8254',
    ],
    'public-life': [
      'https://elections.youth.gov.eg/candidates/indiv_constituencies?constituency=252&governorate=21',
      'https://www.vetogate.com/1878477',
    ],
  },
  'origin-name-al-osairat': {
    'asrat-theory': [
      'https://www.rosaelyoussef.com/-22795',
    ],
    'asir-theory': [
      'https://eladawy.blog/جرجا-وأجوارها/',
      'https://ahmedmahmoued-masoudi.blogspot.com/2020/12/blog-post_64.html',
    ],
    tukh: [
      'https://eladawy.blog/جرجا-وأجوارها/',
    ],
    'village-names': [
      'https://ahmedmahmoued-masoudi.blogspot.com/2020/12/blog-post_64.html',
      'https://www.youmakhir.com/2024/08/blog-post_201.html',
    ],
  },
};

export function getBlogSectionSourceUrls(articleSlug: string, sectionId: string) {
  return blogSectionSourceUrls[articleSlug]?.[sectionId] ?? [];
}

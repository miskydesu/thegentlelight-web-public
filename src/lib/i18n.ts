import { type Country } from './tglApi'

export type { Country }
export type Locale = 'en' | 'ja'

export const COUNTRY_LOCALES: Record<Country, Locale> = {
  us: 'en',
  ca: 'en',
  uk: 'en',
  jp: 'ja',
}

export function getLocaleForCountry(country: Country): Locale {
  return COUNTRY_LOCALES[country]
}

export type Translations = {
  nav: {
    top: string
    today: string
    news: string
    daily: string
    latest: string
  }
  common: {
    search: string
    searchPlaceholder: string
    more: string
    back: string
    next: string
    prev: string
    page: string
  }
  pages: {
    home: {
      title: string
      heroTopics: string
      seeMore: string
    }
    today: {
      title: string
      summary: string
      topics: string
    }
    latest: {
      title: string
      description: string
    }
    news: {
      title: string
      searchResults: string
      noResults: string
      noResultsDescription: string
    }
    category: {
      seeMore: string
    }
    quotes: {
      title: string
      subtitle: string
      themeShelf: string
      filterByTheme: string
      searchPlaceholder: string
      clear: string
      backToList: string
      noResults: string
      noResultsDescription: string
      empty: string
      emptyDescription: string
    }
    saved: {
      title: string
      empty: string
      emptyDescription: string
    }
  }
  empty: {
    noTopics: string
    noTopicsDescription: string
    noSearchResults: string
    noSearchResultsDescription: string
    noCategoryResults: string
    noCategoryResultsDescription: string
  }
  partial: {
    notice: string
    seeLatest: string
  }
}

const translations: Record<Locale, Translations> = {
  en: {
    nav: {
      top: 'Home',
      today: 'Today',
      news: 'News',
      daily: 'Morning Briefing',
      latest: 'Latest',
    },
    common: {
      search: 'Search',
      searchPlaceholder: 'Search quietly...',
      more: 'More',
      back: 'Back',
      next: 'Next',
      prev: 'Previous',
      page: 'Page',
    },
    pages: {
      home: {
        title: 'Top',
        heroTopics: 'Key Topics',
        seeMore: 'See more →',
      },
      today: {
        title: "Today's Summary",
        summary: 'Summary',
        topics: 'Topics',
      },
      latest: {
        title: 'Latest',
        description: 'See updates in chronological order',
      },
      news: {
        title: 'News',
        searchResults: 'Search results',
        noResults: 'No topics found',
        noResultsDescription: 'Please run jobs to create topics first.',
      },
      category: {
        seeMore: '→ News',
      },
      quotes: {
        title: 'Quotes',
        subtitle: 'quotes',
        themeShelf: 'Theme shelves',
        filterByTheme: 'Filter by theme',
        searchPlaceholder: 'Search quotes',
        clear: 'Clear',
        backToList: '← Back to quotes',
        noResults: 'No matching quotes',
        noResultsDescription: 'Try another keyword.',
        empty: 'No quotes yet',
        emptyDescription: 'No published quotes yet.',
      },
      saved: {
        title: 'Saved Topics',
        empty: 'No saved topics',
        emptyDescription: 'Saved topics will appear here.',
      },
    },
    empty: {
      noTopics: 'No topics yet',
      noTopicsDescription: 'Please run jobs to create topics first.',
      noSearchResults: 'No results found',
      noSearchResultsDescription: 'Try a different term or browse by category.',
      noCategoryResults: "There aren't many updates in this category right now",
      noCategoryResultsDescription: "You can check Today's summary or browse other categories.",
    },
    partial: {
      notice: 'Some updates are still being processed. Please check back soon.',
      seeLatest: 'See latest list →',
    },
  },
  ja: {
    nav: {
      top: 'トップ',
      today: '今日',
      news: 'ニュース',
      daily: '朝刊',
      latest: '最新',
    },
    common: {
      search: '検索',
      searchPlaceholder: '気になる言葉を静かに探す',
      more: 'もっと見る',
      back: '戻る',
      next: '次',
      prev: '前',
      page: 'ページ',
    },
    pages: {
      home: {
        title: 'トップ',
        heroTopics: '重要トピック',
        seeMore: 'もっと見る →',
      },
      today: {
        title: '今日のまとめ',
        summary: '要点',
        topics: 'トピック一覧',
      },
      latest: {
        title: '最新一覧',
        description: '更新を時系列でまとめて見たいときに',
      },
      news: {
        title: 'ニュース（棚）',
        searchResults: '検索結果',
        noResults: 'まだトピックがありません',
        noResultsDescription: '先にジョブを実行して topics を作成してください。',
      },
      category: {
        seeMore: 'ニュース一覧へ →',
      },
      quotes: {
        title: '名言',
        subtitle: 'quotes',
        themeShelf: 'テーマ棚',
        filterByTheme: 'テーマで絞り込み',
        searchPlaceholder: '名言や著者で検索',
        clear: 'クリア',
        backToList: '← 名言一覧へ',
        noResults: '該当する名言がありません',
        noResultsDescription: '別のキーワードでもう一度お試しください。',
        empty: '名言がありません',
        emptyDescription: 'まだ公開された名言がありません。',
      },
      saved: {
        title: '保存したトピック',
        empty: '保存したトピックがありません',
        emptyDescription: 'トピックを保存すると、ここに表示されます。',
      },
    },
    empty: {
      noTopics: 'まだトピックがありません',
      noTopicsDescription: '先にジョブを実行して topics を作成してください。',
      noSearchResults: '見つかりませんでした',
      noSearchResultsDescription: '別の言葉にするか、カテゴリから探してみてください。',
      noCategoryResults: 'いまはこのカテゴリの更新が少ないようです',
      noCategoryResultsDescription: 'ほかのカテゴリや「今日のまとめ」を見てみてください。',
    },
    partial: {
      notice: '一部の更新が反映途中です。しばらくしてからもう一度ご覧ください。',
      seeLatest: '最新一覧を見る →',
    },
  },
}

export function getTranslations(locale: Locale): Translations {
  return translations[locale]
}

export function useTranslations(country: Country, lang?: Locale | null): Translations {
  const locale = lang || getLocaleForCountry(country)
  return getTranslations(locale)
}


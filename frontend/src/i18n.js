// src/i18n.js

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 1. 기존 언어 파일 Import
import ko from './locales/ko.json';
import en from './locales/en.json';

// ★ 2. 새로 추가할 언어 파일 Import (경로 확인 필수)
import vi from './locales/vi.json'; // 베트남어
import tl from './locales/tl.json'; // 필리핀어
import id from './locales/id.json'; // 인도네시아어
import my from './locales/my.json'; // 미얀마어

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      // ★ 3. 리소스 목록에 새 언어 추가
      vi: { translation: vi },
      tl: { translation: tl },
      id: { translation: id },
      my: { translation: my },
    },
    // lng: 'ko', // 자동 감지를 위해 주석 처리 유지
    fallbackLng: 'ko', // 감지 실패 시 보여줄 기본 언어
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // 언어 감지 순서: localStorage(이전 선택) > navigator(브라우저 설정)
      order: ['localStorage', 'navigator'],
      // 선택한 언어를 localStorage에 저장
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
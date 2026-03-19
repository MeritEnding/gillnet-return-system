// src/mainPage/MainActionButtons.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const MainActionButtons = ({ onStart, onGuide }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language.startsWith('id');

  return (
    <div className="main-action-box">
      <div className="main-actions-row">
        <button className="main-card blue-card" onClick={onStart}>
          <div className="card-icon-circle"><div className="play-triangle"></div></div>
          <div className="card-label-group">
            <span className={`card-main ${isIndonesian ? 'font-shrink-id' : ''}`}>
              {t('main_start_button')}
            </span>
          </div>
        </button>

        <button className="main-card green-card" onClick={onGuide}>
          <div className="card-icon-question">?</div>
          <div className="card-label-group">
            <span className={`card-main ${isIndonesian ? 'font-shrink-id' : ''}`}>
              {t('main_guide_button')}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default MainActionButtons;
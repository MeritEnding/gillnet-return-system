// src/components/PolicyModal.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import './PolicyModal.css';

const PolicyModal = ({ type, onClose }) => {
  const { t } = useTranslation();

  const isTerms = type === 'terms';
  const title = isTerms ? t('modal_terms_title') : t('modal_privacy_title');
  const contentKey = isTerms ? 'policy_terms_content' : 'policy_privacy_content';

  return (
    <div className="policy-modal-overlay" onClick={onClose}>
      <div className="policy-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="policy-modal-header">
          <h2 className="policy-modal-title">{title || '안내'}</h2>
          <button className="policy-close-icon" onClick={onClose}>&times;</button>
        </div>
        
        <div className="policy-modal-body">
          {/* JSON 파일에 있는 HTML 구조를 그대로 화면에 렌더링합니다 */}
          <div 
            className="policy-text-area" 
            dangerouslySetInnerHTML={{ __html: t(contentKey) }} 
          />
        </div>

        <div className="policy-modal-footer">
          <button className="policy-confirm-btn" onClick={onClose}>
            {t('btn_confirm') || '확인'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PolicyModal;
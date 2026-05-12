import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../mainPage/Home.css';

// ★ [추가] 전화기 아이콘 컴포넌트 (SVG)
const PhoneIconSvg = () => (
  <svg className="contact-phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 수화기 모양 패스 */}
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.63.24-1.01a11.36 11.36 0 0 1-.56-3.53C8.96 3.55 8.19 2.78 7.24 2.78H4.19C3.24 2.78 2.46 3.55 2.46 4.5c0 10.75 8.71 19.46 19.46 19.46.95 0 1.72-.77 1.72-1.72v-3.05c0-.95-.77-1.72-1.72-1.72h-.91z" fill="#105E7C"/>
  </svg>
);

const ContactModal = ({ onClose }) => {
  const { t } = useTranslation();

  // 연락처 목록 데이터
  const contactList = [
    { label: t('contact_label_machine') || '기기 장애 문의', phone: '010-6667-1987' },
    { label: t('contact_label_deposit') || '보증금 문의', phone: '051-718-2452' },
    { label: t('contact_label_general') || '일반 문의', phone: '051-742-3391' } 
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        
        <h2 className="modal-title">{t('contact_title')}</h2>

        <div className="contact-modal-body">
          <p className="contact-desc">{t('contact_desc')}</p>
          
          <div className="contact-list-container">
            {contactList.map((item, index) => (
              <div className="contact-item-row" key={index}>
                {/* 왼쪽: 라벨 */}
                <span className="contact-category">{item.label}</span>
                
                {/* ★ 오른쪽: 아이콘 + 전화번호 묶음 */}
                <div className="contact-phone-wrapper">
                  <PhoneIconSvg />
                  <span className="contact-number">{item.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="modal-close-btn" onClick={onClose}>
          {t('btn_close')}
        </button>
      </div>
    </div>
  );
};

export default ContactModal;
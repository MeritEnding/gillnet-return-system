import { createBrowserRouter } from 'react-router-dom';

import Home from './mainPage/Home';
import UsageGuideScreen from './mainPage/UsageGuideScreen';
import GuideMethodModal from './mainPage/GuideMethodModal';
import GuidePolicyModal from './mainPage/GuidePolicyModal';
import GuideFaqModal from './mainPage/GuideFaqModal';
import AuthScreen from './authPage/AuthScreen';
import TagScanScreen from './certificationPage/TagScanScreen';
import GearScanScreen from './certificationPage/GearScanScreen';
import DepositScreen from './deposit/DepositScreen';
import CompletionScreen from './completionPage/CompletionScreen';
import AlternateAuthScreen from './authPage/AlternateAuthScreen';
import VerifyCodeScreen from './authPage/VerifyCodeScreen';
import AdminScreen from './admin/AdminScreen';
import MyRentalsScreen from './rentalPage/MyRentalsScreen';
import Header from './mainPage/Header';
import NumberInputScreen from './authPage/NumberInputScreen';
import AccountScreen from './authPage/AccountScreen';
import GearTypeSelectScreen from './certificationPage/GearTypeSelectScreen';

const router = createBrowserRouter([
  {
    id: 0,
    path: '/',
    element: <Home />
  },
  {
    id: 1,
    path:'/guide',
    element: <UsageGuideScreen/>
  },
  {
    id:2,
    path: '/auth',
    element: <AuthScreen/>
  },
  {
    id:4,
    path:'/certificationPage/scan',
    element: <TagScanScreen/>
  },
  {
    id: 5,
    path: '/certificationPage/gear-scan',
    element: <GearScanScreen/>
  },
  {
    id:6,
    path:'/deposit',
    element: <DepositScreen/>
  },
  {
    id:8,
    path: '/completion',
    element: <CompletionScreen/>
  },
  {
    id:9,
    path: '/guide/method',
    element: <GuideMethodModal/>
  },
  {
    id:10,
    path: '/guide/policy',
    element: <GuidePolicyModal/>
  },
  {
    id:11,
    path: '/guide/faq',
    element: <GuideFaqModal/>
  },
  {
    id:12,
    path:'/auth/alternate-auth',
    element: <AlternateAuthScreen/>
  },
  {
    id:13,
    path:'/auth/verify',
    element: <VerifyCodeScreen/>
  },
  {
    id:14,
    path:'/admin',
    element: <AdminScreen/>
  },
  {
    id:15,
    path: '/header',
    element: <Header/>
  },
  {
    id:16,
    path: '/my-rentals',
    element: <MyRentalsScreen/>
  },
  {
    id:17,
    path: '/login/number',
    element: <NumberInputScreen/>
  },
  {
    id:18,
    path: '/account',
    element: <AccountScreen/>
  },
  {
    id:19,
    path: '/select-gear',
    element: <GearTypeSelectScreen />
  }
  


]);
export default router;
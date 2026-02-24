import './assets/style.css';
import { createIcons, Zap, Video, Image, History, Settings, Info, Upload, Download, CheckCircle, Link } from 'lucide';
import { VideoModule } from './ui/VideoModule';
import { GifModule } from './ui/GifModule';
import { UIRouter } from './ui/UIRouter';
import { creditManager } from './core/CreditManager';

/**
 * SaaS Video Optimizer - Entry Point
 * Refactored under Clean Architecture Principles
 */
const initApp = () => {
  // 1. Initialize Icons
  createIcons({
    icons: { Zap, Video, Image, History, Settings, Info, Upload, Download, CheckCircle, Link }
  });

  // 2. Initialize UI Router (Navigation)
  UIRouter.init();

  // 3. Sync Credits UI
  const creditDisplay = document.getElementById('credit-count');
  creditManager.subscribe(tokens => {
    if (creditDisplay) creditDisplay.textContent = tokens;
  });

  // 4. Initialize Feature Modules
  VideoModule.init();
  GifModule.init();

  console.log("SaaS Application Initialized.");
};

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

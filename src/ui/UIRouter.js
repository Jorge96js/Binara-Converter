export const UIRouter = {
  elements: {
    navVideo: document.getElementById('nav-video'),
    navGif: document.getElementById('nav-gif'),
    videoPage: document.getElementById('video-page'),
    gifPage: document.getElementById('gif-page')
  },

  init() {
    this.elements.navVideo.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchPage('video');
    });

    this.elements.navGif.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchPage('gif');
    });
  },

  switchPage(page) {
    if (page === 'video') {
      this.elements.videoPage.classList.remove('hidden');
      this.elements.gifPage.classList.add('hidden');
      this.elements.navVideo.classList.add('active');
      this.elements.navGif.classList.remove('active');
    } else {
      this.elements.videoPage.classList.add('hidden');
      this.elements.gifPage.classList.remove('hidden');
      this.elements.navVideo.classList.remove('active');
      this.elements.navGif.classList.add('active');
    }
  }
};

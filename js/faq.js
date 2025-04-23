/**
 * Bedhug Coffee - Interactive Functions
 * 
 * Features:
 * - FAQ accordion functionality
 * - Mobile menu toggle
 * - Accessibility improvements
 */

document.addEventListener('DOMContentLoaded', function() {
  // ==================== FAQ Accordion ====================
  const initFAQAccordion = () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (!faqItems.length) return;

    const closeAllItems = (excludeItem = null) => {
      faqItems.forEach(item => {
        if (item !== excludeItem) {
          item.classList.remove('active');
          const btn = item.querySelector('.toggle-button');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    };

    faqItems.forEach(item => {
      const button = item.querySelector('.toggle-button');
      const answer = item.querySelector('.faq-answer');
      
      if (!button || !answer) return;

      button.addEventListener('click', () => {
        const wasActive = item.classList.contains('active');
        closeAllItems(wasActive ? null : item);
        
        if (!wasActive) {
          item.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
        }
      });

      // Keyboard accessibility
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          button.click();
        }
      });
    });
  };

  // ==================== Mobile Menu ====================
  const initMobileMenu = () => {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!mobileBtn || !navMenu) return;

    mobileBtn.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      
      // Toggle menu state
      navMenu.classList.toggle('active');
      this.setAttribute('aria-expanded', !isExpanded);
      
      // Update icon
      const icon = this.querySelector('i');
      if (icon) {
        icon.className = isExpanded ? 'fas fa-bars' : 'fas fa-times';
      }
    });

    // Close menu when clicking on a link (for single-page navigation)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          mobileBtn.setAttribute('aria-expanded', 'false');
          mobileBtn.querySelector('i').className = 'fas fa-bars';
        }
      });
    });
  };

  // Initialize all components
  initFAQAccordion();
  initMobileMenu();
});
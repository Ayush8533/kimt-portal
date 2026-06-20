// ================= MOBILE MENU TOGGLE =================
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('active');
  });

  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('active');
    }
  });
}

// ================= DROPDOWN =================
document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
  toggle.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const dropdown = toggle.closest('.dropdown');
      document.querySelectorAll('.dropdown').forEach(dd => {
        if (dd !== dropdown) dd.classList.remove('active');
      });
      dropdown.classList.toggle('active');
    }
  });
});

// ================= SMOOTH SCROLL =================
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#' || href.startsWith('http')) return;
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
      }
    }
  });
});

// ================= GALLERY LIGHTBOX =================
const images = document.querySelectorAll(".gallery-thumb img");
let currentIndex = 0;

function openLightbox(index) {
  currentIndex = index;
  document.getElementById("lightboxOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
  showImage();
}

function showImage() {
  const img = images[currentIndex];
  document.getElementById("lbMainImg").src = img.src;
  document.getElementById("lbMainCaption").innerText = img.alt;
  document.getElementById("lbMainCounter").innerText = `${currentIndex + 1} / ${images.length}`;
}

function changeLightbox(step) {
  currentIndex += step;
  if (currentIndex < 0) currentIndex = images.length - 1;
  if (currentIndex >= images.length) currentIndex = 0;
  showImage();
}

function closeLightbox() {
  document.getElementById("lightboxOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

function closeLightboxOutside(e) {
  if (e.target.id === "lightboxOverlay") closeLightbox();
}

document.addEventListener('keydown', function(e) {
  const overlay = document.getElementById('lightboxOverlay');
  if (!overlay || !overlay.classList.contains('active')) return;
  if (e.key === 'ArrowRight') changeLightbox(1);
  if (e.key === 'ArrowLeft')  changeLightbox(-1);
  if (e.key === 'Escape')     closeLightbox();
});

// ================= BACK TO TOP =================
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.pageYOffset > 300);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ================= SCROLL ANIMATIONS =================
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
});

document.querySelectorAll('.card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = '0.5s';
  observer.observe(el);
});

// ================= STICKY NAVBAR =================
window.addEventListener("scroll", function () {
  document.querySelector(".navbar").classList.toggle("scrolled", window.scrollY > 50);
});

// =============================================
// AI CHATBOT — powered by backend Claude API
// =============================================
const QUICK_REPLY_OPTIONS = [
  'Admission Process', 'Courses Offered', 'Fees Structure',
  'Facilities', 'Placement Support', 'Contact & Location'
];

let chatHistory = [];   // [{role:'user'|'bot', content:'...'}]
let chatbotGreeted = false;
let isTyping = false;

const chatbotToggle   = document.getElementById('chatbotToggle');
const chatbotPanel    = document.getElementById('chatbotPanel');
const chatbotClose    = document.getElementById('chatbotClose');
const chatbotMessages = document.getElementById('chatbotMessages');
const chatbotQuickReplies = document.getElementById('chatbotQuickReplies');
const chatbotForm     = document.getElementById('chatbotForm');
const chatbotInput    = document.getElementById('chatbotInput');

function addChatMessage(text, sender) {
  if (!chatbotMessages) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-msg ${sender}`;
  bubble.textContent = text;
  chatbotMessages.appendChild(bubble);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function showTypingIndicator() {
  if (!chatbotMessages) return;
  const el = document.createElement('div');
  el.className = 'chat-msg bot typing-indicator';
  el.id = 'typingIndicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  chatbotMessages.appendChild(el);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function renderQuickReplies() {
  if (!chatbotQuickReplies) return;
  chatbotQuickReplies.innerHTML = '';
  QUICK_REPLY_OPTIONS.forEach(label => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-btn';
    chip.textContent = label;
    chip.addEventListener('click', () => handleUserQuery(label));
    chatbotQuickReplies.appendChild(chip);
  });
}

async function handleUserQuery(query) {
  if (isTyping) return;
  const trimmed = query.trim();
  if (!trimmed) return;

  // Add user message to UI + history
  addChatMessage(trimmed, 'user');
  chatHistory.push({ role: 'user', content: trimmed });
  chatbotQuickReplies.innerHTML = '';

  isTyping = true;
  showTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, history: chatHistory.slice(-10) })
    });

    const data = await res.json();
    removeTypingIndicator();
    isTyping = false;

    if (data.reply) {
      addChatMessage(data.reply, 'bot');
      chatHistory.push({ role: 'bot', content: data.reply });

      // WhatsApp nudge if contact mentioned
      if (/whatsapp|call|contact|phone/i.test(trimmed) || data.reply.includes('9084147587')) {
        setTimeout(() => {
          const waLink = document.createElement('a');
          waLink.href = `https://wa.me/919084147587?text=${encodeURIComponent('Hello, I need help regarding: ' + trimmed)}`;
          waLink.target = '_blank';
          waLink.className = 'chip-btn';
          waLink.style.cssText = 'display:inline-block;margin-top:6px;text-decoration:none;';
          waLink.textContent = '💬 Continue on WhatsApp';
          chatbotMessages.appendChild(waLink);
          chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 400);
      }
    } else {
      addChatMessage(data.fallback || "I couldn't get an answer. Please call +91 9084147587.", 'bot');
    }
  } catch (err) {
    removeTypingIndicator();
    isTyping = false;
    addChatMessage("Connection error. Please call us at +91 9084147587 or WhatsApp.", 'bot');
  }

  // Re-show quick replies after response
  setTimeout(renderQuickReplies, 600);
}

if (chatbotToggle && chatbotPanel) {
  chatbotToggle.addEventListener('click', () => {
    const isOpen = chatbotPanel.classList.contains('open');
    chatbotPanel.classList.toggle('open');
    chatbotToggle.setAttribute('aria-expanded', String(!isOpen));
    chatbotPanel.setAttribute('aria-hidden', String(isOpen));

    if (!isOpen && !chatbotGreeted) {
      chatbotGreeted = true;
      renderQuickReplies();
      setTimeout(() => {
        addChatMessage("Namaste! 🙏 Main KIMT Assistant hoon. Aap mujhse admission, courses, fees, facilities ya placements ke baare mein pooch sakte hain!", 'bot');
      }, 200);
    }
  });

  chatbotClose.addEventListener('click', () => {
    chatbotPanel.classList.remove('open');
    chatbotToggle.setAttribute('aria-expanded', 'false');
    chatbotPanel.setAttribute('aria-hidden', 'true');
  });

  chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = chatbotInput.value.trim();
    if (!value || isTyping) return;
    chatbotInput.value = '';
    handleUserQuery(value);
  });
}

// =============================================
// QUICK INQUIRY FORM — Backend API version
// =============================================
const inquiryForm = document.getElementById('inquiryForm');

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  if (input) input.classList.toggle('invalid', Boolean(message));
  if (errorEl) errorEl.textContent = message || '';
}

function clearAllErrors() {
  ['inqName','inqPhone','inqEmail'].forEach((id, i) => {
    const errIds = ['errName','errPhone','errEmail'];
    setFieldError(id, errIds[i], '');
  });
}

if (inquiryForm) {
  inquiryForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors();

    const statusEl  = document.getElementById('inquiryStatus');
    const submitBtn = document.getElementById('inquirySubmitBtn');

    const data = {
      name:    document.getElementById('inqName').value.trim(),
      phone:   document.getElementById('inqPhone').value.trim(),
      email:   document.getElementById('inqEmail').value.trim(),
      course:  document.getElementById('inqCourse').value,
      message: document.getElementById('inqMessage').value.trim()
    };

    submitBtn.disabled   = true;
    submitBtn.textContent = 'Sending...';
    statusEl.textContent  = '';
    statusEl.className    = 'inquiry-status';

    try {
      const res  = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (!res.ok) {
        // Handle validation errors from backend
        if (json.errors) {
          Object.entries(json.errors).forEach(([field, msg]) => {
            const map = { name:'inqName', phone:'inqPhone', email:'inqEmail', message:'inqMessage' };
            const errMap = { name:'errName', phone:'errPhone', email:'errEmail' };
            if (map[field]) setFieldError(map[field], errMap[field], msg);
          });
          statusEl.textContent = 'Please fix the highlighted fields above.';
          statusEl.classList.add('error');
        } else {
          statusEl.textContent = json.error || 'Submission failed. Please try again.';
          statusEl.classList.add('error');
        }
      } else {
        // Success — open WhatsApp with pre-filled message
        if (json.whatsappUrl) {
          window.open(json.whatsappUrl, '_blank');
        }
        statusEl.textContent = json.message || 'Thank you! Our team will contact you shortly.';
        statusEl.classList.add('success');
        inquiryForm.reset();
      }
    } catch (err) {
      statusEl.textContent = 'Network error. Please call +91 9084147587.';
      statusEl.classList.add('error');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Send Inquiry';
    }
  });
}

console.log("✅ KIMT Script Loaded — AI Chatbot Active");

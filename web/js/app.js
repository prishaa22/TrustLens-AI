/**
 * TrustLens AI — Premium Frontend Controller
 * All dynamic states, simulations, and SVG charts
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // Initialize Lucide Icons
  lucide.createIcons();

  /* ----------------------------------------------------
     DOM SELECTORS
     ---------------------------------------------------- */
  const body = document.body;
  const appMain = document.getElementById('appMain');
  const heroSection = document.getElementById('heroSection');
  const workspaceGrid = document.getElementById('workspaceGrid');
  
  // Theme & Sidebar Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const historySidebar = document.getElementById('historySidebar');
  const historyList = document.getElementById('historyList');
  const historyPlaceholder = document.getElementById('historyPlaceholder');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  
  // Review Form Controls
  const analyzerForm = document.getElementById('analyzerForm');
  const reviewTextArea = document.getElementById('review');
  const ratingInput = document.getElementById('rating');
  const ratingValLabel = document.getElementById('ratingVal');
  const starsSelector = document.getElementById('starsSelector');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const wordCountLabel = document.getElementById('wordCountLabel');
  
  // Scanning overlay
  const loadingOverlay = document.getElementById('loading');
  const scanningProgressBar = document.getElementById('scanningProgressBar');
  const scanningStatusText = document.getElementById('scanningStatusText');
  const steps = [
    document.getElementById('step1'),
    document.getElementById('step2'),
    document.getElementById('step3'),
    document.getElementById('step4'),
    document.getElementById('step5')
  ];

  // Dashboard results
  const resultSection = document.getElementById('resultSection');
  const predictionCard = document.getElementById('predictionCard');
  const verdictIconContainer = document.getElementById('verdictIconContainer');
  const verdictTitle = document.getElementById('verdictTitle');
  const verdictSubtext = document.getElementById('verdictSubtext');
  const verdictMeta = document.getElementById('verdictMeta');
  const confidenceCircle = document.getElementById('confidenceCircle');
  const confidencePercentage = document.getElementById('confidencePercentage');
  const riskCard = document.getElementById('riskCard');
  const riskDot = document.getElementById('riskDot');
  const riskLabel = document.getElementById('riskLabel');
  const riskMarker = document.getElementById('riskMarker');
  const reviewHeatmap = document.getElementById('reviewHeatmap');
  const reasonsList = document.getElementById('reasonsList');
  
  // Dashboard statistics
  const statSentiment = document.getElementById('statSentiment');
  const sentimentIcon = document.getElementById('sentimentIcon');
  const statWords = document.getElementById('statWords');
  const statEmojis = document.getElementById('statEmojis');
  const statUrls = document.getElementById('statUrls');
  const statCaps = document.getElementById('statCaps');
  const statPromo = document.getElementById('statPromo');

  // Dashboard feature bars
  const featValSentiment = document.getElementById('featValSentiment');
  const featFillSentiment = document.getElementById('featFillSentiment');
  const featValPromo = document.getElementById('featValPromo');
  const featFillPromo = document.getElementById('featFillPromo');
  const featValRepeat = document.getElementById('featValRepeat');
  const featFillRepeat = document.getElementById('featFillRepeat');
  const featValEmotion = document.getElementById('featValEmotion');
  const featFillEmotion = document.getElementById('featFillEmotion');
  const featValAbnormal = document.getElementById('featValAbnormal');
  const featFillAbnormal = document.getElementById('featFillAbnormal');

  // Dashboard timeline SVG
  const timelineSvg = document.getElementById('timelineSvg');
  const chartLinePath = document.getElementById('chartLinePath');
  const chartAreaPath = document.getElementById('chartAreaPath');
  const chartDotsGroup = document.getElementById('chartDotsGroup');

  // Interactive buttons
  const heroStartBtn = document.getElementById('heroStartBtn');
  const navTryBtn = document.getElementById('navTryBtn');
  const navLogoBtn = document.getElementById('navLogoBtn');
  const advancedToggleBtn = document.getElementById('advancedToggleBtn');
  const advancedAnalysisSection = document.getElementById('advancedAnalysisSection');

  // Trust Galaxy elements
  const trustGalaxyWrapper = document.getElementById('trustGalaxyWrapper');
  const galaxyEmptyState = document.getElementById('galaxyEmptyState');
  const galaxyCoreValue = document.getElementById('galaxyCoreValue');
  const galaxyTooltip = document.getElementById('galaxyTooltip');
  const galaxyDetailPanel = document.getElementById('galaxyDetailPanel');
  const galaxyDetailLabel = document.getElementById('galaxyDetailLabel');
  const galaxyDetailValue = document.getElementById('galaxyDetailValue');
  const galaxyDetailDesc = document.getElementById('galaxyDetailDesc');
  const galaxyDetailClose = document.getElementById('galaxyDetailClose');
  const galaxyNodes = {
    genuine: document.getElementById('nodeGenuine'),
    fake: document.getElementById('nodeFake'),
    trust: document.getElementById('nodeTrust'),
    confidence: document.getElementById('nodeConfidence')
  };

  /* ----------------------------------------------------
     APP STATE
     ---------------------------------------------------- */
  let activeTheme = 'dark';
  let historyStack = [];
  let currentAnalysisResult = null;

  /* ----------------------------------------------------
     THEME STORAGE & CONTROL
     ---------------------------------------------------- */
  function initTheme() {
    const savedTheme = localStorage.getItem('trustlens_theme');
    if (savedTheme === 'light') {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      activeTheme = 'light';
    } else {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      activeTheme = 'dark';
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    if (activeTheme === 'dark') {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      activeTheme = 'light';
      localStorage.setItem('trustlens_theme', 'light');
    } else {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      activeTheme = 'dark';
      localStorage.setItem('trustlens_theme', 'dark');
    }
  });

  /* ----------------------------------------------------
     SIDEBAR HISTORY MANAGEMENT
     ---------------------------------------------------- */
  function initHistory() {
    const savedHistory = localStorage.getItem('trustlens_history');
    if (savedHistory) {
      try {
        historyStack = JSON.parse(savedHistory);
      } catch (e) {
        historyStack = [];
      }
    }
    renderHistoryList();
  }

  function saveHistoryItem(item) {
    // Avoid duplicate review texts in history list
    historyStack = historyStack.filter(h => h.reviewText !== item.reviewText);
    historyStack.unshift(item);
    // Keep max 15 items
    if (historyStack.length > 15) {
      historyStack.pop();
    }
    localStorage.setItem('trustlens_history', JSON.stringify(historyStack));
    renderHistoryList();
    renderTrustGalaxy();
  }

  function renderHistoryList() {
    historyList.innerHTML = '';
    if (historyStack.length === 0) {
      historyPlaceholder.style.display = 'flex';
      clearHistoryBtn.style.display = 'none';
      return;
    }

    historyPlaceholder.style.display = 'none';
    clearHistoryBtn.style.display = 'flex';

    historyStack.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const snippet = item.reviewText.substring(0, 50) + (item.reviewText.length > 50 ? '...' : '');
      const isFake = item.verdict === 'Fake Review';
      const verdictClass = isFake ? 'fake' : 'genuine';
      const verdictLabel = isFake ? 'Fake' : 'Genuine';
      
      li.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-verdict ${verdictClass}">${verdictLabel}</span>
          <span class="history-item-rating">★ ${item.rating.toFixed(1)}</span>
        </div>
        <p class="history-item-snippet">${escapeHtml(snippet)}</p>
        <div class="history-item-footer">
          <span class="history-item-date">${item.date}</span>
          <span class="history-item-confidence">${Math.round(item.confidence)}% Conf</span>
        </div>
      `;

      li.addEventListener('click', () => {
        loadHistoryItemToUI(item);
        historySidebar.classList.remove('open');
      });
      historyList.appendChild(li);
    });
  }

  /* ----------------------------------------------------
     TRUST GALAXY — live orbital stats visualization
     ---------------------------------------------------- */
  const GALAXY_STAT_META = {
    genuine: { label: 'Genuine Reviews', suffix: '', desc: 'Reviews TrustLens classified as authentic, human-written feedback.' },
    fake: { label: 'Fake Caught', suffix: '', desc: 'Reviews flagged as manipulated, spammy, or AI-generated.' },
    trust: { label: 'Avg. Trust', suffix: '%', desc: 'Average authenticity confidence across every genuine review scanned.' },
    confidence: { label: 'Avg. Confidence', suffix: '%', desc: "The model's average certainty in its verdict across all scans." }
  };

  function computeGalaxyStats() {
    const total = historyStack.length;
    const genuine = historyStack.filter(h => h.verdict !== 'Fake Review').length;
    const fake = total - genuine;
    const avgConfidence = total > 0
      ? historyStack.reduce((sum, h) => sum + (h.confidence || 0), 0) / total
      : 0;
    const trustSource = historyStack.filter(h => h.verdict !== 'Fake Review');
    const avgTrust = trustSource.length > 0
      ? trustSource.reduce((sum, h) => sum + (h.confidence || 0), 0) / trustSource.length
      : 0;

    return {
      total,
      genuine,
      fake,
      trust: Math.round(avgTrust),
      confidence: Math.round(avgConfidence)
    };
  }

  function renderTrustGalaxy() {
    const stats = computeGalaxyStats();

    if (stats.total === 0) {
      trustGalaxyWrapper.classList.add('dormant');
      galaxyCoreValue.textContent = '0';
      return;
    }

    trustGalaxyWrapper.classList.remove('dormant');
    galaxyCoreValue.textContent = stats.total;

    galaxyNodes.genuine.dataset.value = stats.genuine;
    galaxyNodes.fake.dataset.value = stats.fake;
    galaxyNodes.trust.dataset.value = `${stats.trust}%`;
    galaxyNodes.confidence.dataset.value = `${stats.confidence}%`;
  }

  function showGalaxyTooltip(node) {
    const stat = node.dataset.stat;
    const meta = GALAXY_STAT_META[stat];
    const value = node.dataset.value || '0';
    galaxyTooltip.textContent = `${meta.label}: ${value}`;
    galaxyTooltip.classList.remove('hidden');

    const wrapperRect = trustGalaxyWrapper.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const left = nodeRect.left - wrapperRect.left + nodeRect.width / 2;
    const top = nodeRect.top - wrapperRect.top;
    galaxyTooltip.style.left = `${left}px`;
    galaxyTooltip.style.top = `${top}px`;
  }

  function hideGalaxyTooltip() {
    galaxyTooltip.classList.add('hidden');
  }

  function showGalaxyDetail(stat) {
    const meta = GALAXY_STAT_META[stat];
    const node = galaxyNodes[stat];
    galaxyDetailLabel.textContent = meta.label;
    galaxyDetailValue.textContent = node.dataset.value || '0';
    galaxyDetailDesc.textContent = meta.desc;
    galaxyDetailPanel.classList.remove('hidden');
    trustGalaxyWrapper.classList.add('paused');
    hideGalaxyTooltip();
  }

  function hideGalaxyDetail() {
    galaxyDetailPanel.classList.add('hidden');
    trustGalaxyWrapper.classList.remove('paused');
  }

  Object.values(galaxyNodes).forEach(node => {
    if (!node) return;
    node.addEventListener('mouseenter', () => showGalaxyTooltip(node));
    node.addEventListener('mouseleave', hideGalaxyTooltip);
    node.addEventListener('focus', () => showGalaxyTooltip(node));
    node.addEventListener('blur', hideGalaxyTooltip);
    node.addEventListener('click', () => showGalaxyDetail(node.dataset.stat));
  });

  galaxyDetailClose.addEventListener('click', hideGalaxyDetail);

  function loadHistoryItemToUI(item) {
    // Fill form input
    reviewTextArea.value = item.reviewText;
    ratingInput.value = item.rating;
    updateStars(item.rating);
    countWords();

    // Show dashboard direct (no animation sequence)
    currentAnalysisResult = item;
    showDashboard(item);
  }

  clearHistoryBtn.addEventListener('click', () => {
    historyStack = [];
    localStorage.removeItem('trustlens_history');
    renderHistoryList();
    hideGalaxyDetail();
    renderTrustGalaxy();
  });

  // Sidebar toggling
  toggleSidebarBtn.addEventListener('click', () => historySidebar.classList.add('open'));
  closeSidebarBtn.addEventListener('click', () => historySidebar.classList.remove('open'));
  
  // Close sidebar on clicking outside
  document.addEventListener('click', (e) => {
    if (historySidebar.classList.contains('open') && 
        !historySidebar.contains(e.target) && 
        !toggleSidebarBtn.contains(e.target)) {
      historySidebar.classList.remove('open');
    }
  });

  /* ----------------------------------------------------
     RATING STAR & RANGE SLIDER SYNCHRONIZATION
     ---------------------------------------------------- */
  function updateStars(val) {
    const rounded = Math.round(val);
    const starElements = starsSelector.querySelectorAll('.star-btn');
    
    starElements.forEach((star, index) => {
      if (index < rounded) {
        star.classList.add('filled');
      } else {
        star.classList.remove('filled');
      }
    });
    ratingValLabel.textContent = `${parseFloat(val).toFixed(1)} ${parseFloat(val) === 1.0 ? 'Star' : 'Stars'}`;
  }

  // Slider change listener
  ratingInput.addEventListener('input', (e) => {
    updateStars(parseFloat(e.target.value));
  });

  // Star mouseover/click listener
  const starBtns = starsSelector.querySelectorAll('.star-btn');
  starBtns.forEach(btn => {
    btn.addEventListener('mouseover', () => {
      const val = parseInt(btn.getAttribute('data-value'));
      starBtns.forEach((s, idx) => {
        if (idx < val) {
          s.classList.add('hover-fill');
        } else {
          s.classList.remove('hover-fill');
        }
      });
    });

    btn.addEventListener('mouseout', () => {
      starBtns.forEach(s => s.classList.remove('hover-fill'));
    });

    btn.addEventListener('click', () => {
      const val = parseFloat(btn.getAttribute('data-value'));
      ratingInput.value = val;
      updateStars(val);
    });
  });

  // Character and Word Counter
  function countWords() {
    const text = reviewTextArea.value.trim();
    const wordCount = text === '' ? 0 : text.split(/\s+/).length;
    wordCountLabel.textContent = wordCount;
  }
  reviewTextArea.addEventListener('input', countWords);

  /* ----------------------------------------------------
     LUGUISTIC RULES & HEURISTIC ENGINE (MOCK ML MODEL)
     ---------------------------------------------------- */
  const SPAM_TRIGGER_WORDS = [
    { word: 'amazing deal', label: 'Promotional hook' },
    { word: 'buy now', label: 'Call to action' },
    { word: 'click here', label: 'Spam redirect' },
    { word: 'gift card', label: 'Incentivized review' },
    { word: 'unbelievable price', label: 'Promotional bias' },
    { word: 'discount code', label: 'Affiliate marketer marker' },
    { word: 'free money', label: 'Cash voucher scam' },
    { word: 'best purchase ever', label: 'Superlative hyperbole' },
    { word: 'absolute scam', label: 'Emotional vitriol' },
    { word: 'don\'t buy', label: 'Negative hyperbole' },
    { word: 'waste of money', label: 'Emotional critique' },
    { word: '100% genuine', label: 'Suspicious over-assurance' },
    { word: 'perfect product', label: 'Unrealistic perfection' },
    { word: 'earns cash', label: 'Monetized referral link' },
    { word: 'paid for review', label: 'Transactional bias' }
  ];

  const CRITICAL_WORDS = [
    'amazing', 'perfect', 'scam', 'awful', 'trash', 'greatest', 
    'unbelievable', 'shocked', 'miracle', 'insane', 'free', 'win', 
    'gift', 'coupon', 'hack', 'secret', 'guaranteed'
  ];

  function runMockAnalysis(reviewText, rating) {
    const normalized = reviewText.toLowerCase();
    const words = reviewText.trim().split(/\s+/);
    const wordCount = words.length;

    // Feature Extractors
    let urlsCount = (reviewText.match(/https?:\/\/[^\s]+/g) || []).length;
    let emojiCount = (reviewText.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu) || []).length;
    
    let capsWordsCount = 0;
    words.forEach(w => {
      // Exclude simple single chars like A or I, and ensure it's alphabetical
      if (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) {
        capsWordsCount++;
      }
    });

    let capsPercentage = wordCount > 0 ? (capsWordsCount / wordCount) * 100 : 0;
    
    // Check spam triggers
    let triggeredPromos = [];
    SPAM_TRIGGER_WORDS.forEach(item => {
      if (normalized.includes(item.word)) {
        triggeredPromos.push(item);
      }
    });

    // Score calculations
    let sentiment = 'Neutral';
    let sentimentAlignment = 75; // Baseline match
    let promotionalDensity = Math.min((triggeredPromos.length * 25) + (urlsCount * 30), 100);
    let abnormalStyles = Math.min((capsPercentage * 2.5) + (emojiCount * 12), 100);
    
    // Simple sentiment classifier
    let posCount = (normalized.match(/(good|great|best|love|excellent|perfect|nice|happy|amazing|awesome|superb)/g) || []).length;
    let negCount = (normalized.match(/(bad|worst|scam|hate|trash|broken|poor|waste|awful|return|disappointed)/g) || []).length;

    if (posCount > negCount) {
      sentiment = 'Positive';
    } else if (negCount > posCount) {
      sentiment = 'Negative';
    }

    // Sentiment alignment with rating checks
    if ((sentiment === 'Positive' && rating <= 2.0) || (sentiment === 'Negative' && rating >= 4.0)) {
      sentimentAlignment = 15; // Extreme conflict
    } else if (sentiment === 'Neutral') {
      sentimentAlignment = 50;
    } else {
      sentimentAlignment = 95;
    }

    // Emotion wording density
    let emotionalWording = Math.min((posCount + negCount) * 15, 100);
    
    // Repetitive Word Rate
    let uniqueWords = new Set(words.map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase()));
    let repetitionRate = wordCount > 0 ? ((wordCount - uniqueWords.size) / wordCount) * 100 : 0;
    
    // Classification Logic (Decision Tree / Heuristic Score)
    let fakeProbability = 15; // Baseline fake rate

    // Add risk increments
    if (urlsCount > 0) fakeProbability += 25;
    if (triggeredPromos.length > 0) fakeProbability += (triggeredPromos.length * 20);
    if (sentimentAlignment < 30) fakeProbability += 30; // Rating mismatch
    if (capsPercentage > 20) fakeProbability += 15;
    if (wordCount < 6) fakeProbability += 20; // Suspiciously short
    if (repetitionRate > 40) fakeProbability += 10;
    
    fakeProbability = Math.min(fakeProbability, 98);
    fakeProbability = Math.max(fakeProbability, 3); // cap between 3% and 98%

    let verdict = 'Genuine Review';
    let risk = 'Low Risk';
    let confidence = 100 - fakeProbability;

    if (fakeProbability > 65) {
      verdict = 'Fake Review';
      risk = 'High Risk';
      confidence = fakeProbability;
    } else if (fakeProbability > 35) {
      verdict = 'Fake Review'; // Call it fake/suspicious above 35
      risk = 'Medium Risk';
      confidence = fakeProbability;
    } else {
      // Genuine Review
      confidence = 100 - fakeProbability;
      if (confidence < 75) {
        risk = 'Medium Risk'; // borderline genuine
      } else {
        risk = 'Low Risk';
      }
    }

    // AI Explanations Generator
    let explanations = [];
    if (verdict === 'Genuine Review') {
      explanations.push({ status: 'check', text: 'Natural sentence structures and grammar flow.' });
      if (sentimentAlignment > 60) {
        explanations.push({ status: 'check', text: 'Text sentiment matches the numerical star rating.' });
      }
      if (promotionalDensity < 15) {
        explanations.push({ status: 'check', text: 'Absence of external marketing URLs or pushy calls to action.' });
      }
      if (repetitionRate < 30) {
        explanations.push({ status: 'check', text: 'Linguistic patterns have rich vocabulary and standard repetition ratios.' });
      }
      if (abnormalStyles < 20) {
        explanations.push({ status: 'check', text: 'No excessive capital letters or abnormal emojis.' });
      }
    } else {
      // Fake review warnings
      if (triggeredPromos.length > 0) {
        explanations.push({ status: 'warn', text: `Contains promotional phrases: "${triggeredPromos.map(p => p.word).join(', ')}".` });
      }
      if (sentimentAlignment < 30) {
        explanations.push({ status: 'warn', text: 'Significant mismatch between text sentiment and selected star rating.' });
      }
      if (urlsCount > 0) {
        explanations.push({ status: 'warn', text: 'Embedded hyperlinks which is common in phishing or affiliate review loops.' });
      }
      if (capsPercentage > 20) {
        explanations.push({ status: 'warn', text: 'High density of capitalized words, indicating shouting/forced emotion.' });
      }
      if (repetitionRate > 40) {
        explanations.push({ status: 'warn', text: 'Linguistic redundancy detected (repetitive phrasing patterns).' });
      }
      if (wordCount < 8) {
        explanations.push({ status: 'warn', text: 'Review is abnormally short, conveying lack of descriptive user experience.' });
      }
    }

    // Build timeline confidence data points
    // Let's create an incremental confidence curve ending at the final score
    let baseConfidence = 35 + Math.random() * 15;
    let step2Confidence = baseConfidence + (confidence - baseConfidence) * 0.4;
    let step3Confidence = baseConfidence + (confidence - baseConfidence) * 0.75;
    let timelinePoints = [
      Math.round(baseConfidence),
      Math.round(step2Confidence),
      Math.round(step3Confidence),
      Math.round(confidence)
    ];

    // Build Heatmap highlighting markup
    let heatmapHtml = highlightSuspiciousWords(reviewText);

    return {
      reviewText,
      rating,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verdict,
      confidence,
      risk,
      explanations,
      stats: {
        sentiment,
        wordCount,
        emojiCount,
        urlsCount,
        capsPercentage,
        promotionalDensity
      },
      featureImportance: {
        sentiment: sentimentAlignment,
        promo: promotionalDensity,
        repeat: repetitionRate,
        emotion: emotionalWording,
        abnormal: abnormalStyles
      },
      timeline: timelinePoints
    };
  }

  function highlightSuspiciousWords(text) {
    let output = escapeHtml(text);
    
    // Scan for spam trigger multi-word phrases first
    SPAM_TRIGGER_WORDS.forEach(item => {
      const regex = new RegExp(`(${escapeRegExp(item.word)})`, 'gi');
      output = output.replace(regex, `<span class="suspicious-highlight" data-tooltip="${item.label}">$1</span>`);
    });

    // Scan for single keywords if not already wrapped
    CRITICAL_WORDS.forEach(word => {
      // Find words not inside html tag properties
      const regex = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi');
      output = output.replace(regex, (match, p1) => {
        // Simple check to prevent wrapping inside span attributes
        return `<span class="suspicious-highlight" data-tooltip="High-sentiment word">${p1}</span>`;
      });
    });

    // Highlight exclamation loops
    output = output.replace(/(!{2,})/g, `<span class="suspicious-highlight" data-tooltip="Excessive punctuation">$1</span>`);

    return output;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ----------------------------------------------------
     SCANNING SIMULATION TIMELINE
     ---------------------------------------------------- */
  analyzerForm.addEventListener("submit", async (e) => {

    e.preventDefault();
    const text = reviewTextArea.value.trim();
    if (text === '') return;

    const ratingVal = parseFloat(ratingInput.value);
    
    // Disable submit
    analyzeBtn.disabled = true;
    
    // Reset scanner overlays and show
    loadingOverlay.classList.remove('hidden');
    scanningProgressBar.style.width = '0%';
    
    steps.forEach(step => {
      step.classList.remove('active', 'completed');
    });

    // Run the computation in advance
    let results;

    try {

        const response = await fetch("http://127.0.0.1:8000/predict", {

            method: "POST",

            headers: {
             "Content-Type": "application/json"
            },

            body: JSON.stringify({

                review: text,

                rating: ratingVal

            })

        });

        results = await response.json();
        const backend = results;

        results = {

          reviewText: text,

          rating: ratingVal,

          date: new Date().toLocaleDateString(),

          verdict: backend.prediction,

          summary: backend.summary,

          confidence: backend.confidence,

          risk: backend.risk_level,

          emotion: backend.emotion,

          overallTrust: backend.overall_trust,

          authenticityScore: backend.authenticity_score,

          fakeProbability: backend.fake_probability,

          featureSummary: backend.feature_summary,

          processingTimeMs: backend.processing_time_ms,

          explanations: backend.reasons.map(r => ({

              status:
                  /mismatch|present|short on detail/i.test(r)
                  ? "warn"
                  : "check",

              text: r

          })),

          stats: backend.stats,

          reviewSignals: backend.reviewSignals,

          indicators: backend.indicators,

          pipeline: backend.pipeline,

          features: backend.features,



          timeline: [

              30,

              55,

              78,

              Math.round(results.confidence)

          ]

        };

        currentAnalysisResult = results;

    }
    catch(error){

        console.error(error);

        alert("Could not connect to TrustLens AI Backend.");

        analyzeBtn.disabled = false;

        loadingOverlay.classList.add("hidden");

        return;

    }

    // Timeline durations (total ~ 2.2 seconds)
    const stepInterval = 400; 

    // Step 1: Active
    activateStep(0, 'Scanning review text...', 15);

    setTimeout(() => {
      completeStep(0);
      activateStep(1, 'Extracting sentiment vectors...', 35);
    }, stepInterval);

    setTimeout(() => {
      completeStep(1);
      activateStep(2, 'Extracting NLP metadata...', 55);
    }, stepInterval * 2);

    setTimeout(() => {
      completeStep(2);
      activateStep(3, 'Running ensemble classification...', 75);
    }, stepInterval * 3);

    setTimeout(() => {
      completeStep(3);
      activateStep(4, 'Synthesizing XAI local explanation...', 95);
    }, stepInterval * 4);

    setTimeout(() => {
      completeStep(4);
      scanningProgressBar.style.width = '100%';
      
      // Wrap up and transition dashboard
      setTimeout(() => {
        loadingOverlay.classList.add('hidden');
        analyzeBtn.disabled = false;
        
        // Show result dashboard
        showDashboard(results);
        
        // Save to sidebar history list
        saveHistoryItem(results);

      }, 300);

    }, stepInterval * 5);
  });

  function activateStep(index, statusText, progressWidth) {
    scanningStatusText.textContent = statusText;
    scanningProgressBar.style.width = `${progressWidth}%`;
    steps[index].classList.add('active');
  }

  function completeStep(index) {
    steps[index].classList.remove('active');
    steps[index].classList.add('completed');
  }

  /* ----------------------------------------------------
     DASHBOARD REVEAL & RENDERING
     ---------------------------------------------------- */
  function scrollToResultsSection() {
    if (!resultSection) return;

    const navbar = document.querySelector('.navbar');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const headingOffset = 96;
    const targetY = resultSection.getBoundingClientRect().top + window.scrollY - navbarHeight - headingOffset;

    window.scrollTo({
      top: Math.max(targetY, 0),
      behavior: 'smooth'
    });
  }

  function showDashboard(data) {
    // 1. Transition columns
    appMain.classList.add('dashboard-active');
    document.body.classList.add('dashboard-active');
    resultSection.classList.remove('hidden');

    // Each new scan starts with Advanced Analysis collapsed
    collapseAdvancedAnalysis();
    
    // Smooth scroll to the results dashboard so users land on the report
    setTimeout(() => {
      scrollToResultsSection();
    }, 250);

    // 2. Render Verdict Card
    const isFake = data.verdict === 'Fake Review';
    if (isFake) {
      verdictIconContainer.className = 'verdict-icon-glow fake-glow';
      verdictIconContainer.innerHTML = '<i data-lucide="alert-triangle"></i>';
      verdictTitle.textContent = 'Fake Review';
      verdictTitle.style.color = 'var(--color-danger)';
      verdictSubtext.textContent = data.summary;
    } else {
      verdictIconContainer.className = 'verdict-icon-glow genuine-glow';
      verdictIconContainer.innerHTML = '<i data-lucide="shield-check"></i>';
      verdictTitle.textContent = 'Genuine Review';
      verdictTitle.style.color = 'var(--color-success)';
      verdictSubtext.textContent = data.summary;
    }

    // 2b. Render verdict meta line (trust / authenticity / fake probability / processing time)
    if (verdictMeta) {
      const metaParts = [];

      if (data.overallTrust !== undefined && data.overallTrust !== null) {
        metaParts.push(`Trust: ${data.overallTrust}`);
      }
      if (data.authenticityScore !== undefined && data.authenticityScore !== null) {
        metaParts.push(`Authenticity: ${data.authenticityScore}%`);
      }
      if (data.fakeProbability !== undefined && data.fakeProbability !== null) {
        metaParts.push(`Fake Probability: ${data.fakeProbability}%`);
      }
      const isNoSignalsPlaceholder =
        Array.isArray(data.featureSummary) &&
        data.featureSummary.length === 1 &&
        data.featureSummary[0] === 'No Suspicious Linguistic Patterns';

      if (Array.isArray(data.featureSummary) && data.featureSummary.length > 0 && !isNoSignalsPlaceholder) {
        metaParts.push(`${data.featureSummary.length} signal${data.featureSummary.length === 1 ? '' : 's'} flagged`);
      }
      if (data.processingTimeMs !== undefined && data.processingTimeMs !== null) {
        metaParts.push(`Analyzed in ${Math.round(data.processingTimeMs)}ms`);
      }

      verdictMeta.textContent = metaParts.join(' · ');
    }

    // 3. Circular Progress ring animation
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    confidenceCircle.style.strokeDasharray = `${circumference}`;
    
    // Animate percentage text from 0 to value
    let count = 0;
    const finalVal = Math.round(data.confidence);
    const speed = 1500 / finalVal; // adjust total animation duration to ~1.5s
    
    const progressTimer = setInterval(() => {
      if (count >= finalVal) {
        clearInterval(progressTimer);
        confidencePercentage.textContent = `${finalVal}%`;
      } else {
        count++;
        confidencePercentage.textContent = `${count}%`;
      }
    }, speed);

    // Set SVG offset
    const offset = circumference - (data.confidence / 100) * circumference;
    confidenceCircle.style.strokeDashoffset = offset;
    
    // Set circle stroke color depending on risk
    if (data.risk === 'High') {
      confidenceCircle.style.stroke = 'var(--color-danger)';
    } else if (data.risk === 'Medium') {
      confidenceCircle.style.stroke = 'var(--color-warning)';
    } else {
      confidenceCircle.style.stroke = 'var(--color-success)';
    }

    // 4. Risk Level badge rendering
    riskDot.className = 'risk-dot';
    if (data.risk === 'High') {
      riskDot.classList.add('high');
      riskLabel.textContent = 'High Risk';
      riskLabel.style.color = 'var(--color-danger)';
      riskMarker.style.left = `${data.confidence}%`;
    } else if (data.risk === 'Medium') {
      riskDot.classList.add('medium');
      riskLabel.textContent = 'Medium Risk';
      riskLabel.style.color = 'var(--color-warning)';
      // map medium to middle slider region
      const pos = isFake ? data.confidence : (100 - data.confidence);
      riskMarker.style.left = `${Math.max(35, Math.min(pos, 65))}%`;
    } else {
      riskDot.classList.add('low');
      riskLabel.textContent = 'Low Risk';
      riskLabel.style.color = 'var(--color-success)';
      riskMarker.style.left = `${Math.max(5, 100 - data.confidence)}%`;
    }

    // 5. Render Heatmap Text
    reviewHeatmap.innerHTML = data.reviewText ? data.reviewText : 'No review analyzed';
    reviewHeatmap.innerHTML = data.reviewText ? highlightSuspiciousWords(data.reviewText) : 'No review text parsed';

    // 6. AI Explanation sequential bullets reveal
    reasonsList.innerHTML = '';
    data.explanations.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'reason-item';
      const icon = item.status === 'check' 
        ? '<i data-lucide="check-circle-2" class="reason-icon check"></i>'
        : '<i data-lucide="alert-circle" class="reason-icon warn"></i>';
      
      li.innerHTML = `
        ${icon}
        <span>${item.text}</span>
      `;
      reasonsList.appendChild(li);

      // Cascading visual reveal
      setTimeout(() => {
        li.classList.add('visible');
      }, index * 200 + 300);
    });

    // 7. Render Statistics Panel Values
    statWords.textContent =
    data.stats.wordCount;

    statEmojis.textContent =
    data.stats.emojiCount;

    statUrls.textContent =
    data.stats.urlsCount;

    statCaps.textContent =
    data.stats.capsCount;

    statPromo.textContent =
    data.stats.promotionalWords;

    
  statSentiment.textContent =
  data.emotion;

  if(data.emotion==="Positive"){

      sentimentIcon.className="lucide lucide-smile";

  }

  else if(data.emotion==="Negative"){

      sentimentIcon.className="lucide lucide-frown";

  }

  else{

      sentimentIcon.className="lucide lucide-meh";

  }

  lucide.createIcons();

    // 8. Render Feature Importance progress bars
  animateProgressBar(

  featFillSentiment,

  featValSentiment,

  Math.abs(data.reviewSignals.sentiment)*100

  );

  animateProgressBar(

  featFillPromo,

  featValPromo,

  Math.min(

  data.indicators.promotionalWords*20,

  100

  )

  );

  animateProgressBar(

  featFillRepeat,

  featValRepeat,

  data.reviewSignals.repeatedWordRatio*100

  );

  animateProgressBar(

  featFillEmotion,

  featValEmotion,

  Math.abs(data.reviewSignals.subjectivity)*100

  );

  animateProgressBar(

  featFillAbnormal,

  featValAbnormal,

  Math.min(

  data.indicators.emojiCount*15+

  data.indicators.urlCount*30+

  data.indicators.allCapsWords*10,

  100

  )

  );
    // 9. Draw AI Confidence Timeline SVG
  drawTimelineChart([

    15,

    35,

    65,

    data.confidence

    ]);

    // Refresh icons inside rendered widgets
    lucide.createIcons();
  }

  function animateProgressBar(fillElem, valElem, targetVal) {
    fillElem.style.width = '0%';
    valElem.textContent = '0%';
    
    setTimeout(() => {
      fillElem.style.width = `${Math.round(targetVal)}%`;
      
      let curr = 0;
      const t = Math.round(targetVal);
      if (t === 0) {
        valElem.textContent = '0%';
        return;
      }
      const speed = 1000 / t;
      const countTimer = setInterval(() => {
        if (curr >= t) {
          clearInterval(countTimer);
          valElem.textContent = `${t}%`;
        } else {
          curr++;
          valElem.textContent = `${curr}%`;
        }
      }, speed);
    }, 150);
  }

  /* ----------------------------------------------------
     DASHBOARD TIMELINE CHART MAKER
     ---------------------------------------------------- */
  function drawTimelineChart(points) {
    // Canvas bounds in SVG: Width 400, Height 180
    // Points contain 4 values corresponding to step margins
    const chartWidth = 400;
    const chartHeight = 180;
    const paddingX = 50; 
    const stepSize = 100; // spacing between nodes X: 50, 150, 250, 350
    
    // Clean dynamic nodes first
    chartDotsGroup.innerHTML = '';

    // Calculate Y coordinates: baseline Y axis grid starts at 20px (100%) and ends at 140px (0%)
    // Y = 140 - (val/100)*120
    const coords = points.map((val, idx) => {
      const x = paddingX + idx * stepSize;
      const y = 140 - (val / 100) * 120;
      return { x, y, value: val };
    });

    // 1. Generate Line Path: SVG Bezier curve or segmented stroke
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Draw smooth cubic curves between points
      const cpX1 = coords[i - 1].x + stepSize / 2;
      const cpY1 = coords[i - 1].y;
      const cpX2 = coords[i].x - stepSize / 2;
      const cpY2 = coords[i].y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
    }
    
    // Set stroke path
    chartLinePath.setAttribute('d', pathD);
    
    // Trigger stroke-drawing CSS animation
    chartLinePath.style.strokeDashoffset = '1000';
    setTimeout(() => {
      chartLinePath.style.strokeDashoffset = '0';
    }, 100);

    // 2. Generate Area Path (to fill gradient under curve)
    const areaD = `${pathD} L ${coords[coords.length - 1].x} 140 L ${coords[0].x} 140 Z`;
    chartAreaPath.setAttribute('d', areaD);
    chartAreaPath.style.opacity = '0';
    setTimeout(() => {
      chartAreaPath.style.opacity = '1';
    }, 800);

    // 3. Append Circle Dots
    coords.forEach((coord, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', coord.x);
      circle.setAttribute('cy', coord.y);
      circle.setAttribute('r', '5.5');
      circle.setAttribute('class', 'chart-dot');
      circle.setAttribute('stroke', i === 3 ? 'var(--color-purple)' : 'var(--color-primary)');
      circle.setAttribute('fill', 'var(--bg-primary)');
      
      // Hover tooltips on SVG nodes
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Pipeline Step ${i+1}: ${coord.value}% Confidence`;
      circle.appendChild(title);
      
      chartDotsGroup.appendChild(circle);
    });
  }

  /* ----------------------------------------------------
     INTERACTIVE INTERFACE TRIGGERS
     ---------------------------------------------------- */
  function goHome() {
    // Reset view
    appMain.classList.remove('dashboard-active');
    document.body.classList.remove('dashboard-active');
    resultSection.classList.add('hidden');

    // Reset fields
    reviewTextArea.value = '';
    ratingInput.value = 3.0;
    updateStars(3.0);
    countWords();

    currentAnalysisResult = null;
    collapseAdvancedAnalysis();

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLogoBtn.addEventListener('click', goHome);

  // Advanced Analysis collapsible toggle
  function collapseAdvancedAnalysis() {
    advancedAnalysisSection.classList.remove('expanded');
    advancedToggleBtn.classList.remove('expanded');
    advancedToggleBtn.querySelector('span').textContent = 'Show Advanced Analysis';
    advancedToggleBtn.setAttribute('aria-expanded', 'false');
  }

  advancedToggleBtn.addEventListener('click', () => {
    const isExpanded = advancedAnalysisSection.classList.toggle('expanded');
    advancedToggleBtn.classList.toggle('expanded', isExpanded);
    advancedToggleBtn.querySelector('span').textContent = isExpanded
      ? 'Hide Advanced Analysis'
      : 'Show Advanced Analysis';
    advancedToggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  });

  // Hero click triggers
  heroStartBtn.addEventListener('click', () => {
    reviewTextArea.scrollIntoView({ behavior: 'smooth' });
    reviewTextArea.focus();
  });

  navTryBtn.addEventListener('click', () => {
    // Load a prefilled review to let users see how it works instantly
    reviewTextArea.value = "Unbelievable deal!!! Click here for a free gift card upon registering! This is the absolute best headphones purchase I have ever made, 100% genuine and perfect product! Don't buy anywhere else, buy now!!!";
    ratingInput.value = 5.0;
    updateStars(5.0);
    countWords();
    reviewTextArea.scrollIntoView({ behavior: 'smooth' });
    
    // Brief highlight effect on analyzer card
    const card = document.querySelector('.analyzer-card');
    card.style.borderColor = 'var(--color-primary)';
    setTimeout(() => {
      card.style.borderColor = '';
    }, 1000);
  });

  /* ----------------------------------------------------
     FAQ ACCORDION
     ---------------------------------------------------- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(other => {
        other.classList.remove('open');
        other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ----------------------------------------------------
     LEGAL MODALS (Privacy Policy / Terms of Use)
     ---------------------------------------------------- */
  const privacyPolicyLink = document.getElementById('privacyPolicyLink');
  const termsOfUseLink = document.getElementById('termsOfUseLink');
  const privacyPolicyModal = document.getElementById('privacyPolicyModal');
  const termsOfUseModal = document.getElementById('termsOfUseModal');

  function openModal(modal) {
    modal.classList.remove('hidden');
  }
  function closeModal(modal) {
    modal.classList.add('hidden');
  }

  if (privacyPolicyLink && privacyPolicyModal) {
    privacyPolicyLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(privacyPolicyModal);
    });
  }
  if (termsOfUseLink && termsOfUseModal) {
    termsOfUseLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(termsOfUseModal);
    });
  }

  [privacyPolicyModal, termsOfUseModal].forEach(modal => {
    if (!modal) return;
    // Close via the X button
    modal.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(modal));
    });
    // Close by clicking the dark backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Close any open legal modal with Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(privacyPolicyModal);
      closeModal(termsOfUseModal);
    }
  });

  /* -------------------------------------
     APP STARTUP INITIALIZATION
     ---------------------------------------------------- */
  initTheme();
  initHistory();
  renderTrustGalaxy();
  updateStars(3.0);
  countWords();

});
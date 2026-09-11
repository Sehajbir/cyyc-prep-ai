/* CYYC Prep AI — no framework required. */
(() => {
  'use strict';

  const STORAGE_KEY = 'cyyc-prep-decks-v1';
  const OPS_KEY = 'cyyc-prep-ops-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeImage = (value) => typeof value === 'string' && /^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,[a-z0-9+\/=\r\n]+$/i.test(value) ? value : '';
  const shuffle = (items) => { const copy = [...items]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
  const formatDate = () => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date()).toUpperCase();

  // Keep the trainer usable when the API is temporarily unavailable (for
  // example, when the HTML is hosted without the Python process). The API
  // normally replaces this with the same source-of-truth data from rules.py.
  const FALLBACK_RULES = {
    note: 'Using the built-in Apron 1 table. Start the Python server to load the API copy.',
    runways: [
      { name: '17R', flow: '17', tableKey: 'dep17R', arrivalLabel: '17R / 17L' },
      { name: '17L', flow: '17', tableKey: 'dep17L', arrivalLabel: '17R / 17L' },
      { name: '35L', flow: '35', tableKey: 'dep35L', arrivalLabel: '35L / 35R' },
      { name: '35R', flow: '35', tableKey: 'dep35R', arrivalLabel: '35L / 35R' },
    ],
    gateRules: [
      { gates: '1–6, 12, 14, 16, 18, 20', gateNumbers: [1, 2, 3, 4, 5, 6, 12, 14, 16, 18, 20], arrival17: 'HB', dep17R: 'K', dep17L: 'HB', arrival35: 'K', dep35L: 'HB', dep35R: 'HB' },
      { gates: '21–24, 11, 13, 15, 17, 19', gateNumbers: [11, 13, 15, 17, 19, 21, 22, 23, 24], arrival17: 'HB', dep17R: 'HB', dep17L: 'HB', arrival35: 'HB', dep35L: 'HB', dep35R: 'HB' },
      { gates: '31–40, 50, 52, 54, 56, 58', gateNumbers: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 50, 52, 54, 56, 58], arrival17: 'HD', dep17R: 'G', dep17L: 'G', arrival35: 'HD', dep35L: 'G', dep35R: 'G' },
      { gates: '51, 53, 55, 57, 59, 70–73, 76', gateNumbers: [51, 53, 55, 57, 59, 70, 71, 72, 73, 76], arrival17: 'JT*', dep17R: 'G', dep17L: 'JS', arrival35: 'JS', dep35L: 'JT*', dep35R: 'E' },
      { gates: '79, 78, 75, 74, 80/81, 84/85, 88/89, 92', gateNumbers: [74, 75, 78, 79, 80, 81, 84, 85, 88, 89, 92], arrival17: 'EA/BA', dep17R: 'JR', dep17L: 'JR', arrival35: 'EA/BA', dep35L: 'JR', dep35R: 'JR' },
      { gates: '82/83, 86/86, 90/91, 93, 94, 95', gateNumbers: [82, 83, 86, 90, 91, 93, 94, 95], arrival17: 'BA**', dep17R: 'BC', dep17L: 'BC', arrival35: 'BA**', dep35L: 'BC', dep35R: 'BC' },
    ],
    taxiwayPositions: [
      { taxiway: 'K', positions: ['4', '5'] }, { taxiway: 'HB', positions: ['6', '7'] },
      { taxiway: 'HD', positions: ['8', '9'] }, { taxiway: 'G', positions: ['10', '11'] },
      { taxiway: 'JT', positions: ['14'] }, { taxiway: 'JS', positions: ['15'] },
      { taxiway: 'E', positions: ['16'] }, { taxiway: 'JR', positions: ['17'] },
      { taxiway: 'EA', positions: ['18', '19', '20'] }, { taxiway: 'BA', positions: ['21', '22'] },
      { taxiway: 'BC', positions: ['23', '24'] },
    ],
    taxiways: ['K', 'HB', 'HD', 'G', 'JT', 'JS', 'E', 'JR', 'EA', 'BA', 'BC'],
    positions: ['4', '5', '6', '7', '8', '9', '10', '11', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
  };

  let decks = loadDecks();
  let airportRules = FALLBACK_RULES;
  let currentView = 'dashboardView';
  let editingDeckId = null;
  let editingCardId = null;
  let draftImages = { question: '', answer: '' };
  let selectedReviewDeckId = null;
  let selectedReviewLevel = 'all';
  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewRevealed = false;
  let reviewCorrectCount = 0;
  let scenarioMode = 'random';
  let currentScenario = null;
  let scenarioSelection = null;
  let scenarioAnswered = false;
  let opsStats = loadOpsStats();

  function loadDecks() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return normalizeDecks(raw);
    } catch (error) { return []; }
  }

  function normalizeDecks(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((deck) => ({
      id: deck.id || uid('deck'),
      name: String(deck.name || 'Untitled deck').slice(0, 80),
      description: String(deck.description || '').slice(0, 140),
      createdAt: deck.createdAt || new Date().toISOString(),
      cards: Array.isArray(deck.cards) ? deck.cards.map((card) => ({
        id: card.id || uid('card'), question: String(card.question || ''), answer: String(card.answer || ''),
        questionImage: typeof card.questionImage === 'string' ? card.questionImage : '',
        answerImage: typeof card.answerImage === 'string' ? card.answerImage : '',
        difficulty: ['new', 'easy', 'mid', 'hard'].includes(card.difficulty) ? card.difficulty : 'new',
      })) : [],
    }));
  }

  function saveDecks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
      refreshAll();
      return true;
    } catch (error) {
      showToast('Could not save. The browser storage limit may have been reached.', 'error');
      return false;
    }
  }

  function loadOpsStats() {
    try { return Object.assign({ completed: 0, correct: 0, streak: 0, lastDate: '' }, JSON.parse(localStorage.getItem(OPS_KEY) || '{}')); }
    catch (error) { return { completed: 0, correct: 0, streak: 0, lastDate: '' }; }
  }
  function saveOpsStats() { localStorage.setItem(OPS_KEY, JSON.stringify(opsStats)); }

  function totalCards() { return decks.reduce((total, deck) => total + deck.cards.length, 0); }
  function newCards() { return decks.reduce((total, deck) => total + deck.cards.filter((card) => card.difficulty === 'new').length, 0); }
  function accuracy() { return opsStats.completed ? Math.round((opsStats.correct / opsStats.completed) * 100) : null; }

  function refreshAll() {
    updateNavAndOverview();
    renderDeckList();
    renderFlashStats();
    renderOpsStats();
  }

  function updateNavAndOverview() {
    $('#navDeckCount').textContent = decks.length;
    $('#todayDate').textContent = formatDate();
    $('#overviewCardCount').textContent = totalCards();
    $('#overviewDeckSummary').textContent = decks.length ? `${decks.length} deck${decks.length === 1 ? '' : 's'} · ${newCards()} new to review` : 'Create a deck to get started.';
    $('#overviewApronAccuracy').textContent = accuracy() === null ? '—' : `${accuracy()}%`;
    $('#overviewApronSummary').textContent = opsStats.completed ? `${opsStats.completed} scenario${opsStats.completed === 1 ? '' : 's'} completed` : 'No scenarios completed yet.';
    $('#snapshotNewCards').textContent = newCards();
    $('#snapshotStreak').textContent = opsStats.streak;
    $('#snapshotNote').textContent = opsStats.completed ? `You have made ${opsStats.correct} correct route decision${opsStats.correct === 1 ? '' : 's'} so far.` : 'Your next correct answer is one practice round away.';
  }

  function renderFlashStats() {
    const easy = decks.reduce((n, deck) => n + deck.cards.filter((c) => c.difficulty === 'easy').length, 0);
    const hard = decks.reduce((n, deck) => n + deck.cards.filter((c) => c.difficulty === 'hard').length, 0);
    $('#flashStats').innerHTML = [
      ['DECKS', decks.length, 'blue'], ['TOTAL CARDS', totalCards(), 'blue'], ['NEW TO REVIEW', newCards(), 'mint'],
    ].map(([label, value, tone]) => `<div class="stat-box"><strong class="stat-accent ${tone}">${value}</strong><small>${label}</small></div>`).join('');
    // Keep these values available for future dashboard expansion without cluttering the UI.
    $('#flashStats').dataset.rated = `${easy + hard}`;
  }

  function renderDeckList() {
    const list = $('#deckList');
    $('#deckCountLabel').textContent = `${decks.length} deck${decks.length === 1 ? '' : 's'}`;
    if (!decks.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-glyph">▤</div><strong>Your library is clear.</strong><p>Create a deck with questions, answers, and optional images to begin.</p><button class="primary-button" data-action="newDeck">Create first deck</button></div>`;
      return;
    }
    list.innerHTML = decks.map((deck, index) => {
      const pending = deck.cards.filter((card) => card.difficulty === 'new').length;
      const letter = escapeHtml((deck.name.trim()[0] || 'D').toUpperCase());
      return `<div class="deck-row"><div class="deck-info"><div class="deck-letter">${letter}</div><div><div class="deck-name">${escapeHtml(deck.name)}</div><div class="deck-meta">${deck.cards.length} card${deck.cards.length === 1 ? '' : 's'} · ${pending} new${deck.description ? ` · ${escapeHtml(deck.description)}` : ''}</div></div></div><div class="deck-actions"><button class="review-button" data-review="${deck.id}">Review</button><button data-edit="${deck.id}" title="Edit deck">Edit</button><button data-delete="${deck.id}" title="Delete deck">×</button></div></div>`;
    }).join('');
  }

  function renderOpsStats() {
    $('#opsStats').innerHTML = [
      ['SCENARIOS', opsStats.completed, 'total'],
      ['ACCURACY', accuracy() === null ? '—' : `${accuracy()}%`, 'accent'],
      ['DAY STREAK', opsStats.streak, 'accent'],
    ].map(([label, value, tone]) => `<div class="stat-box"><strong class="${tone}">${value}</strong><small>${label}</small></div>`).join('');
  }

  function switchView(viewId) {
    currentView = viewId;
    $$('.view').forEach((view) => view.classList.toggle('active', view.id === viewId));
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewId));
    $('#currentCrumb').textContent = viewId === 'flashcardsView' ? 'FLASH CARDS' : viewId === 'apronView' ? 'APRON OPS' : 'OVERVIEW';
    $('#sidebar').classList.remove('open');
    if (viewId === 'apronView' && !currentScenario) newScenario();
  }

  function openModal(id) { const modal = $(`#${id}`); if (modal) { modal.hidden = false; document.body.style.overflow = 'hidden'; } }
  function closeModal(id) { const modal = $(`#${id}`); if (modal) { modal.hidden = true; if (!$$('.modal-backdrop:not([hidden])').length) document.body.style.overflow = ''; } }
  function closeAllModals() { $$('.modal-backdrop').forEach((modal) => { modal.hidden = true; }); document.body.style.overflow = ''; }

  function openNewDeck() {
    editingDeckId = null;
    $('#deckModalTitle').textContent = 'New deck';
    $('#deckNameInput').value = '';
    $('#deckDescriptionInput').value = '';
    $('#saveDeckButton').textContent = 'Save deck';
    renderModalCardList([]);
    openModal('deckModal');
  }

  function openEditDeck(deckId) {
    const deck = decks.find((item) => item.id === deckId); if (!deck) return;
    editingDeckId = deckId;
    $('#deckModalTitle').textContent = 'Edit deck';
    $('#deckNameInput').value = deck.name;
    $('#deckDescriptionInput').value = deck.description;
    $('#saveDeckButton').textContent = 'Save changes';
    renderModalCardList(deck.cards);
    openModal('deckModal');
  }

  function renderModalCardList(cards) {
    $('#cardLibraryTitle').textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;
    $('#modalCardList').innerHTML = cards.length ? cards.map((card) => `<div class="modal-card-row"><div class="modal-card-copy"><strong>${escapeHtml(card.question || '[Image question]')}</strong><small>${card.questionImage ? 'Question image · ' : ''}${card.answerImage ? 'Answer image · ' : ''}<span class="card-tag">${escapeHtml(card.difficulty)}</span></small></div><button data-card-edit="${card.id}" title="Edit card">✎</button><button data-card-delete="${card.id}" title="Delete card">×</button></div>`).join('') : `<div class="empty-state" style="padding: 28px 12px"><div class="empty-glyph">＋</div><strong>No cards yet.</strong><p>Add your first question and answer below.</p></div>`;
  }

  function getEditingDeckCards() {
    return editingDeckId ? (decks.find((deck) => deck.id === editingDeckId)?.cards || []) : [];
  }

  function openCardEditor(cardId = null) {
    editingCardId = cardId;
    const card = cardId ? getEditingDeckCards().find((item) => item.id === cardId) : null;
    $('#cardModalTitle').textContent = card ? 'Edit card' : 'Add a card';
    $('#saveCardButton').textContent = card ? 'Save card' : 'Add card';
    $('#questionInput').value = card?.question || '';
    $('#answerInput').value = card?.answer || '';
    draftImages = { question: card?.questionImage || '', answer: card?.answerImage || '' };
    updateImagePreview('question', draftImages.question);
    updateImagePreview('answer', draftImages.answer);
    openModal('cardModal');
  }

  function updateImagePreview(side, src) {
    const preview = $(`#${side}ImagePreview`);
    preview.innerHTML = src ? `<img src="${src}" alt="${side} preview">` : '';
    preview.classList.toggle('visible', Boolean(src));
  }

  function saveDeck() {
    const name = $('#deckNameInput').value.trim();
    if (!name) { showToast('Give this deck a name first.', 'error'); $('#deckNameInput').focus(); return; }
    const description = $('#deckDescriptionInput').value.trim();
    if (editingDeckId) {
      const deck = decks.find((item) => item.id === editingDeckId);
      if (deck) { deck.name = name; deck.description = description; }
    } else {
      const deck = { id: uid('deck'), name, description, createdAt: new Date().toISOString(), cards: [] };
      decks.unshift(deck); editingDeckId = deck.id;
    }
    saveDecks();
    $('#deckModalTitle').textContent = 'Edit deck';
    $('#saveDeckButton').textContent = 'Save changes';
    renderModalCardList(getEditingDeckCards());
    showToast('Deck saved.', 'success');
  }

  function saveCard() {
    const question = $('#questionInput').value.trim();
    const answer = $('#answerInput').value.trim();
    if (!question && !draftImages.question) { showToast('Add a question or a question image.', 'error'); return; }
    if (!answer && !draftImages.answer) { showToast('Add an answer or an answer image.', 'error'); return; }
    let deck = editingDeckId ? decks.find((item) => item.id === editingDeckId) : null;
    if (!deck) {
      showToast('Save the deck before adding cards.', 'error'); closeModal('cardModal'); return;
    }
    const cardData = { question, answer, questionImage: draftImages.question, answerImage: draftImages.answer };
    if (editingCardId) {
      const card = deck.cards.find((item) => item.id === editingCardId);
      if (card) Object.assign(card, cardData);
    } else {
      deck.cards.push({ id: uid('card'), ...cardData, difficulty: 'new' });
    }
    saveDecks();
    renderModalCardList(deck.cards);
    closeModal('cardModal');
    showToast(editingCardId ? 'Card updated.' : 'New card added.', 'success');
    editingCardId = null;
  }

  function deleteDeck(deckId) {
    const deck = decks.find((item) => item.id === deckId); if (!deck) return;
    if (!window.confirm(`Delete “${deck.name}” and all ${deck.cards.length} cards?`)) return;
    decks = decks.filter((item) => item.id !== deckId); saveDecks(); showToast('Deck deleted.');
  }

  function deleteCard(cardId) {
    const deck = decks.find((item) => item.id === editingDeckId); if (!deck) return;
    deck.cards = deck.cards.filter((card) => card.id !== cardId); saveDecks(); renderModalCardList(deck.cards); showToast('Card removed.');
  }

  function openReviewSetup(deckId) {
    const deck = decks.find((item) => item.id === deckId); if (!deck) return;
    if (!deck.cards.length) { showToast('Add at least one card before reviewing.', 'error'); return; }
    selectedReviewDeckId = deckId; selectedReviewLevel = 'all';
    $('#setupDeckName').textContent = `${deck.name} · ${deck.cards.length} cards`;
    $$('.difficulty-option').forEach((option) => option.classList.toggle('selected', option.dataset.level === 'all'));
    openModal('reviewSetupModal');
  }

  function beginReview() {
    const deck = decks.find((item) => item.id === selectedReviewDeckId); if (!deck) return;
    reviewQueue = shuffle(deck.cards.filter((card) => card.difficulty === 'new' || selectedReviewLevel === 'all' || (selectedReviewLevel === 'mid' && ['mid', 'hard'].includes(card.difficulty)) || (selectedReviewLevel === 'hard' && card.difficulty === 'hard')));
    if (!reviewQueue.length) { showToast('No cards match that focus yet. Try a wider level.', 'error'); return; }
    reviewIndex = 0; reviewRevealed = false; reviewCorrectCount = 0;
    closeModal('reviewSetupModal'); openModal('reviewModal'); renderReviewCard();
  }

  function renderReviewCard() {
    const deck = decks.find((item) => item.id === selectedReviewDeckId);
    if (!deck || reviewIndex >= reviewQueue.length) { renderReviewComplete(); return; }
    const card = reviewQueue[reviewIndex]; reviewRevealed = false;
    $('#reviewDeckLabel').textContent = deck.name.toUpperCase();
    $('#reviewProgressLabel').textContent = `${reviewIndex + 1} / ${reviewQueue.length}`;
    $('#reviewProgressBar').style.width = `${((reviewIndex) / reviewQueue.length) * 100}%`;
    const image = card.questionImage ? `<img class="review-image" src="${card.questionImage}" alt="Question image">` : '';
    $('#reviewCard').innerHTML = `<span class="card-side-label">QUESTION</span>${card.question ? `<h2>${escapeHtml(card.question)}</h2>` : ''}${image}${card.difficulty === 'new' ? '<span class="new-card-label">NEW CARD</span>' : ''}<button class="reveal-button" id="revealButton">Reveal answer <span>↓</span></button>`;
    $('#reviewActions').innerHTML = '';
  }

  function revealReviewCard() {
    const card = reviewQueue[reviewIndex]; if (!card) return;
    reviewRevealed = true;
    const image = card.answerImage ? `<img class="review-image" src="${card.answerImage}" alt="Answer image">` : '';
    $('#reviewCard').innerHTML = `<span class="card-side-label">ANSWER</span>${card.answer ? `<p>${escapeHtml(card.answer)}</p>` : ''}${image}<button class="reveal-button" id="hideAnswerButton">↑ Hide answer</button>`;
    $('#reviewActions').innerHTML = `<button class="rate-button easy" data-rate="easy">1 · Easy</button><button class="rate-button mid" data-rate="mid">2 · Mid</button><button class="rate-button hard" data-rate="hard">3 · Hard</button>`;
  }

  function rateReviewCard(difficulty) {
    const deck = decks.find((item) => item.id === selectedReviewDeckId); const queueCard = reviewQueue[reviewIndex]; if (!deck || !queueCard) return;
    const storedCard = deck.cards.find((card) => card.id === queueCard.id); if (storedCard) storedCard.difficulty = difficulty;
    reviewCorrectCount += difficulty !== 'hard' ? 1 : 0;
    saveDecks(); reviewIndex += 1; renderReviewCard();
  }

  function renderReviewComplete() {
    $('#reviewProgressLabel').textContent = `${reviewQueue.length} / ${reviewQueue.length}`;
    $('#reviewProgressBar').style.width = '100%';
    $('#reviewCard').innerHTML = `<div class="review-complete"><div class="complete-mark">✓</div><h2>Session complete.</h2><p>${reviewQueue.length} card${reviewQueue.length === 1 ? '' : 's'} reviewed · ${reviewCorrectCount} rated Easy or Mid</p><button class="primary-button" id="closeReviewButton">Back to flash cards</button></div>`;
    $('#reviewActions').innerHTML = '';
  }

  function exportDecks() {
    const payload = { format: 'cyyc-prep-ai-decks', version: 1, exportedAt: new Date().toISOString(), decks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `cyyc-prep-decks-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
    showToast(`Exported ${decks.length} deck${decks.length === 1 ? '' : 's'}.`, 'success');
  }

  function importDeckFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = normalizeDecks(Array.isArray(parsed) ? parsed : parsed.decks);
        if (!Array.isArray(parsed) && !Array.isArray(parsed?.decks)) throw new Error('missing decks');
        if (!window.confirm(`Replace your current ${decks.length} deck${decks.length === 1 ? '' : 's'} with ${imported.length} imported deck${imported.length === 1 ? '' : 's'}?`)) return;
        decks = imported; saveDecks(); showToast(`Imported ${decks.length} deck${decks.length === 1 ? '' : 's'}.`, 'success');
      } catch (error) { showToast('That file is not a valid CYYC Prep deck export.', 'error'); }
      $('#importInput').value = '';
    };
    reader.readAsText(file);
  }

  function readImage(file, side) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Choose an image file.', 'error'); return; }
    const reader = new FileReader(); reader.onload = () => { draftImages[side] = reader.result; updateImagePreview(side, reader.result); }; reader.readAsDataURL(file);
  }

  function routeOptions(route) {
    return String(route || '').split('/').map((value) => value.replace(/\*/g, '').trim()).filter(Boolean);
  }

  function positionChoicesForTaxiway(taxiway) {
    const base = String(taxiway || '').replace(/\*/g, '');
    return airportRules.taxiwayPositions.find((row) => row.taxiway === base)?.positions || [];
  }

  function buildScenario() {
    if (!airportRules) return null;
    const direction = scenarioMode === 'random' ? (Math.random() < .5 ? 'arrival' : 'departure') : scenarioMode;
    const runway = airportRules.runways[Math.floor(Math.random() * airportRules.runways.length)];
    const gateGroup = airportRules.gateRules[Math.floor(Math.random() * airportRules.gateRules.length)];
    const gate = gateGroup.gateNumbers[Math.floor(Math.random() * gateGroup.gateNumbers.length)];
    const routeKey = direction === 'arrival' ? `arrival${runway.flow}` : runway.tableKey;
    const route = gateGroup[routeKey];
    const correctTaxiways = routeOptions(route);
    const callsigns = ['WJA', 'ACA', 'JZA', 'POE', 'ROU'];
    const callsign = `${callsigns[Math.floor(Math.random() * callsigns.length)]} ${Math.floor(100 + Math.random() * 899)}`;
    return {
      direction, runway, gate, gateGroup, callsign, route,
      correctTaxiways,
      correctPositions: direction === 'departure' ? positionChoicesForTaxiway(correctTaxiways[0]) : [],
    };
  }

  function newScenario() {
    currentScenario = buildScenario(); scenarioSelection = null; scenarioAnswered = false; renderScenario();
  }

  function renderScenario() {
    const panel = $('#scenarioPanel'); if (!currentScenario) { panel.innerHTML = '<div class="empty-state">Loading scenario…</div>'; return; }
    const s = currentScenario; const isArrival = s.direction === 'arrival';
    const taxiwayChoices = airportRules.taxiways;
    const selectedTaxi = scenarioSelection?.taxiway || '';
    const selectedSpot = scenarioSelection?.spot || '';
    // Keep every Apron 1 position visible so the learner must use the table,
    // rather than receiving the answer from a filtered list.
    const spotChoices = airportRules.positions;
    const routeQuestion = isArrival ? 'Select the taxiway to enter Apron 1' : 'Select the position and taxiway to exit Apron 1';
    const validPositionHint = positionChoicesForTaxiway(selectedTaxi);
    const answerHint = isArrival ? 'One selection required.' : selectedTaxi ? `Valid positions for ${selectedTaxi}: ${validPositionHint.join(', ')}` : 'Select a taxiway and any mapped position.';
    const optionButtons = (items, selected, type) => items.map((item) => `<button class="answer-option ${selected === item ? 'selected' : ''}" data-answer-type="${type}" data-answer-value="${item}">${item}</button>`).join('');
    const result = scenarioAnswered ? renderScenarioResult(s) : '';
    const runwayLabel = isArrival ? s.runway.arrivalLabel : s.runway.name;
    panel.innerHTML = `<div class="scenario-content"><div class="scenario-topline"><div class="scenario-label"><i></i> ${isArrival ? 'ARRIVAL REQUEST' : 'DEPARTURE REQUEST'}</div><span class="scenario-count">RANDOM SCENARIO</span></div><div class="request-card"><h2>${escapeHtml(s.callsign)} <span>requests ${isArrival ? 'entry' : 'exit'}.</span></h2><p>${isArrival ? 'Arrival runway assigned. Select the correct taxiway to enter Apron 1.' : 'Departure runway assigned. Select the correct taxiway and Apron 1 position to exit.'}</p></div><div class="request-grid"><div class="request-detail"><small>Movement</small><strong class="orange">${isArrival ? 'ARRIVAL' : 'DEPARTURE'}</strong></div><div class="request-detail"><small>${isArrival ? 'Arrival' : 'Departure'} runway</small><strong>${escapeHtml(runwayLabel)}</strong></div><div class="request-detail"><small>Gate request</small><strong>Gate ${s.gate}</strong></div></div><div class="answer-area"><h3>${routeQuestion}</h3>${!isArrival ? `<div class="choice-label">APRON 1 POSITION #</div><div class="answer-grid" data-group="spot">${optionButtons(spotChoices, selectedSpot, 'spot')}</div>` : ''}<div class="choice-label ${!isArrival ? 'taxi-label' : ''}">TAXIWAY</div><div class="answer-grid" data-group="taxiway">${optionButtons(taxiwayChoices, selectedTaxi, 'taxiway')}</div><div class="answer-actions"><span class="answer-hint">${answerHint}</span><button class="primary-button submit-answer" id="submitScenario" ${scenarioAnswered ? 'disabled' : ''}>Check route <span>→</span></button></div>${result}</div></div>`;
  }

  function isCorrectScenario(s) {
    const selectedTaxiway = scenarioSelection?.taxiway;
    const correctTaxiways = Array.isArray(s.correctTaxiways) ? s.correctTaxiways : [];
    if (!selectedTaxiway || !correctTaxiways.includes(selectedTaxiway)) return false;
    if (s.direction === 'arrival') return true;

    // A taxiway may have more than one Apron 1 position. Any one of the
    // positions mapped to the selected taxiway is a correct departure answer.
    const validPositions = positionChoicesForTaxiway(selectedTaxiway);
    return Boolean(scenarioSelection?.spot) && validPositions.includes(String(scenarioSelection.spot));
  }

  function renderScenarioResult(s) {
    const isCorrect = isCorrectScenario(s);
    const correctTaxiways = Array.isArray(s.correctTaxiways) ? s.correctTaxiways : [];
    const correctPositions = Array.isArray(s.correctPositions) && s.correctPositions.length
      ? s.correctPositions
      : positionChoicesForTaxiway(correctTaxiways[0]);
    const taxiwayLabel = String(s.route || correctTaxiways.join('/')).replace(/\*/g, '');
    const answer = s.direction === 'arrival'
      ? `Taxiway ${taxiwayLabel}`
      : `Position ${correctPositions.join(' or ')} · Taxiway ${taxiwayLabel}`;
    return `<div class="scenario-result ${isCorrect ? 'correct' : 'incorrect'}"><div><strong>${isCorrect ? 'Correct route.' : 'Not quite.'}</strong><small>${isCorrect ? 'Good read on the supplied Apron 1 table.' : `The table calls for ${answer}.`}</small></div><button class="next-scenario" id="nextScenario">Next scenario ↗</button></div>`;
  }

  function submitScenario() {
    const s = currentScenario; if (!s || scenarioAnswered) return;
    const hasTaxiway = Boolean(scenarioSelection?.taxiway);
    const hasPosition = s.direction === 'arrival' || Boolean(scenarioSelection?.spot);
    if (!hasTaxiway || !hasPosition) {
      showToast(s.direction === 'arrival' ? 'Select a taxiway first.' : 'Select both a taxiway and an Apron 1 position.', 'error');
      return;
    }
    const correct = isCorrectScenario(s);
    scenarioAnswered = true; opsStats.completed += 1; if (correct) opsStats.correct += 1;
    const today = new Date().toISOString().slice(0, 10);
    if (opsStats.lastDate !== today) { const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10); opsStats.streak = opsStats.lastDate === yesterday ? opsStats.streak + 1 : 1; opsStats.lastDate = today; }
    saveOpsStats(); refreshAll(); renderScenario();
  }

  function renderRulesReference(rules) {
    $('#rulesNote').textContent = rules.note;
    $('#routeTable tbody').innerHTML = rules.gateRules.map((row) => `<tr><td>${escapeHtml(row.gates)}</td><td>${escapeHtml(row.arrival17)}</td><td>${escapeHtml(row.dep17R)}</td><td>${escapeHtml(row.dep17L)}</td><td>${escapeHtml(row.arrival35)}</td><td>${escapeHtml(row.dep35L)}</td><td>${escapeHtml(row.dep35R)}</td></tr>`).join('');
    $('#positionTable tbody').innerHTML = rules.taxiwayPositions.map((row) => `<tr><td>${escapeHtml(row.taxiway)}</td><td>${escapeHtml(row.positions.join(', '))}</td></tr>`).join('');
  }

  function setupRules() {
    fetch('/api/rules').then((response) => {
      if (!response.ok) throw new Error('Rules API unavailable');
      return response.json();
    }).then((rules) => {
      if (!Array.isArray(rules.runways) || !Array.isArray(rules.gateRules) || !Array.isArray(rules.taxiwayPositions)) throw new Error('Rules API returned an older table format');
      airportRules = rules;
      renderRulesReference(rules);
      newScenario();
    }).catch(() => {
      // Do not leave the game blank if an old server process or static host is
      // serving the page without the current /api/rules response.
      airportRules = FALLBACK_RULES;
      renderRulesReference(FALLBACK_RULES);
      newScenario();
    });
  }

  function showToast(message, type = '') {
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; $('#toastStack').appendChild(toast);
    setTimeout(() => { toast.classList.add('fade'); setTimeout(() => toast.remove(), 320); }, 3100);
  }

  // Global click delegation keeps dynamically rendered deck and scenario controls simple.
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.dataset.view) { switchView(target.dataset.view); return; }
    if (target.dataset.action === 'newDeck') { switchView('flashcardsView'); openNewDeck(); return; }
    if (target.dataset.action === 'quickReview') { switchView('flashcardsView'); if (decks.length) openReviewSetup(decks[0].id); else showToast('Create a deck before starting a review.', 'error'); return; }
    if (target.dataset.close) { closeModal(target.dataset.close); return; }
    if (target.dataset.review) { openReviewSetup(target.dataset.review); return; }
    if (target.dataset.edit) { openEditDeck(target.dataset.edit); return; }
    if (target.dataset.delete) { deleteDeck(target.dataset.delete); return; }
    if (target.dataset.cardEdit) { openCardEditor(target.dataset.cardEdit); return; }
    if (target.dataset.cardDelete) { deleteCard(target.dataset.cardDelete); return; }
    if (target.dataset.level) { selectedReviewLevel = target.dataset.level; $$('.difficulty-option').forEach((option) => option.classList.toggle('selected', option.dataset.level === selectedReviewLevel)); return; }
    if (target.dataset.rate) { rateReviewCard(target.dataset.rate); return; }
    if (target.id === 'revealButton') { revealReviewCard(); return; }
    if (target.id === 'hideAnswerButton') { renderReviewCard(); return; }
    if (target.id === 'closeReviewButton') { closeModal('reviewModal'); switchView('flashcardsView'); return; }
    if (target.dataset.mode) { scenarioMode = target.dataset.mode; $$('.mode-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === scenarioMode)); newScenario(); return; }
    if (target.dataset.answerType) {
      if (scenarioAnswered) return;
      scenarioSelection = scenarioSelection || {};
      scenarioSelection[target.dataset.answerType] = target.dataset.answerValue;
      renderScenario();
      return;
    }
    if (target.id === 'submitScenario') { submitScenario(); return; }
    if (target.id === 'nextScenario') { newScenario(); return; }
  });

  $('#newDeckButton').addEventListener('click', openNewDeck);
  $('#addCardButton').addEventListener('click', () => { if (!editingDeckId) { showToast('Save the deck before adding cards.', 'error'); return; } openCardEditor(); });
  $('#saveDeckButton').addEventListener('click', saveDeck);
  $('#saveCardButton').addEventListener('click', saveCard);
  $('#exportButton').addEventListener('click', exportDecks);
  $('#importButton').addEventListener('click', () => $('#importInput').click());
  $('#importInput').addEventListener('change', (event) => importDeckFile(event.target.files[0]));
  $('#questionImageInput').addEventListener('change', (event) => readImage(event.target.files[0], 'question'));
  $('#answerImageInput').addEventListener('change', (event) => readImage(event.target.files[0], 'answer'));
  $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllModals();
    if (!$('#reviewModal').hidden && reviewRevealed && ['1', '2', '3'].includes(event.key)) rateReviewCard({ '1': 'easy', '2': 'mid', '3': 'hard' }[event.key]);
  });

  // Initial paint. Generate locally first so Apron Ops is immediately usable;
  // the API response refreshes the reference table and scenario afterwards.
  refreshAll();
  newScenario();
  setupRules();
})();

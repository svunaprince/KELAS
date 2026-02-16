document.addEventListener('DOMContentLoaded', () => {
    // Helper to format date as YYYY-MM-DD
    const formatDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const today = new Date();

    // State management with LocalStorage
    // State management with LocalStorage
    // --- FIREBASE CONFIGURATION ---
    const firebaseConfig = {
        apiKey: "AIzaSyC9UPWFSabRqfyuDjkeHI3qSHdDGEnxI2g",
        authDomain: "jadwalkursusea.firebaseapp.com",
        projectId: "jadwalkursusea",
        storageBucket: "jadwalkursusea.firebasestorage.app",
        messagingSenderId: "498190380364",
        appId: "1:498190380364:web:541e18eb21d1c0bf2ff3e9",
        measurementId: "G-EV1PSMXSF0",
        // Added databaseURL manually based on projectId
        databaseURL: "https://jadwalkursusea-default-rtdb.firebaseio.com"
    };

    // Initialize Firebase (Compat)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    const dbRef = db.ref('english_course_schedule'); // Main data node

    // Default State Definition
    const defaultState = {
        currentDate: new Date(),
        selectedDate: new Date(),
        editingId: null,
        deletingId: null,
        totalSessions: 24, // Fixed total sessions per course
        recurringSchedules: [],
        customSchedules: [],
        cancelledClasses: {}, // "YYYY-MM-DD-ScheduleID": true
        overrides: {}
    };

    // Global State Variable (Initialized with defaults)
    let state = { ...defaultState };


    // --- STATUS INDICATOR ---
    const renderStatusIndicator = () => {
        let el = document.getElementById('firebase-status');
        if (!el) {
            el = document.createElement('div');
            el.id = 'firebase-status';
            el.style.cssText = 'position:fixed; bottom:10px; right:10px; background:#fff; padding:5px 10px; border-radius:15px; box-shadow:0 2px 5px rgba(0,0,0,0.2); font-size:12px; display:flex; align-items:center; gap:5px; z-index:9999;';
            document.body.appendChild(el);
        }
        return el;
    };

    const updateStatus = (status, msg = '') => {
        const el = renderStatusIndicator();
        let color = '#ccc';
        let text = 'Disconnected';

        if (status === 'connected') {
            color = '#2ecc71';
            text = 'Online (Realtime)';
        } else if (status === 'saving') {
            color = '#f1c40f';
            text = 'Saving...';
        } else if (status === 'error') {
            color = '#e74c3c';
            text = 'Error!';
        }

        el.innerHTML = `<div style="width:8px; height:8px; background:${color}; border-radius:50%;"></div> ${text} ${msg}`;
    };

    // --- REAL-TIME SYNC LISTENER ---
    const initFirebaseListener = () => {
        // Monitor Connection State
        const connectedRef = db.ref(".info/connected");
        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                updateStatus('connected');
            } else {
                updateStatus('disconnected');
            }
        });

        dbRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("Data received from Firebase", data);

                state.recurringSchedules = data.recurringSchedules || [];
                state.customSchedules = data.customSchedules || [];
                state.cancelledClasses = data.cancelledClasses || {};
                state.overrides = data.overrides || {};

            } else {
                console.log("No data in Firebase, initializing empty state.");
                // If brand new DB, save default state to init structure
                // But let's check if recurringSchedules is truly empty or just null
                // saveStateToStorage(); // Careful not to overwrite if connection flap
            }
            renderApp();
        }, (error) => {
            console.error("Firebase Read Error:", error);
            updateStatus('error', error.message);
            alert("Gagal terhubung ke database: " + error.message + "\nPeriksa konfigurasi databaseURL Anda.");
        });
    };

    // Start Listener
    initFirebaseListener();

    // Replace Save Function
    const saveStateToStorage = () => {
        updateStatus('saving');
        // We only save the DATA parts to Firebase
        const dataToSave = {
            recurringSchedules: state.recurringSchedules,
            customSchedules: state.customSchedules,
            cancelledClasses: state.cancelledClasses,
            overrides: state.overrides
        };

        // Use .set() to overwrite the node
        dbRef.update(dataToSave).then(() => {
            updateStatus('connected', '(Saved)');
            setTimeout(() => updateStatus('connected'), 2000);
        }).catch(error => {
            console.error("Firebase Write Error:", error);
            updateStatus('error', 'Save Failed');
            alert("Gagal menyimpan perubahan: " + error.message);
        });
    };

    // DOM Elements
    const miniCalendar = document.getElementById('miniCalendar');
    const timeline = document.getElementById('dailyTimeline');
    const scheduleGrid = document.getElementById('scheduleGrid');
    const modal = document.getElementById('scheduleModal');
    const btnAdd = document.getElementById('btnAddSchedule');
    const btnClose = document.querySelector('.close-modal');
    const form = document.getElementById('scheduleForm');
    const modalTitle = document.querySelector('#scheduleModal h2');
    const btnSubmit = document.querySelector('.btn-submit');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const scheduleMonthYear = document.getElementById('scheduleMonthYear');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const dateNavPrev = document.querySelector('.date-navigator button:first-child');
    const dateNavNext = document.querySelector('.date-navigator button:last-child');

    // Bright Color Palette (20 colors)
    const CLASS_COLORS = [
        '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9',
        '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9',
        '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2',
        '#FFCCBC', '#D7CCC8', '#F5F5F5', '#CFD8DC', '#FFAB91'
    ];

    function renderColorPicker(selectedColor = null) {
        const container = document.getElementById('colorPickerContainer');
        const input = document.getElementById('colorInput');
        if (!container || !input) return;

        container.innerHTML = '';

        // If no color selected, pick random one for default
        if (!selectedColor) {
            selectedColor = CLASS_COLORS[Math.floor(Math.random() * CLASS_COLORS.length)];
        }

        input.value = selectedColor;

        CLASS_COLORS.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-option';
            div.style.backgroundColor = color;

            if (color === selectedColor) {
                div.classList.add('selected');
            }

            div.addEventListener('click', () => {
                // Remove selected class from all
                document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
                // Add to clicked
                div.classList.add('selected');
                // Update input
                input.value = color;
            });

            container.appendChild(div);
        });
    }

    // Init
    try {
        renderApp();
    } catch (err) {
        console.error("Critical error starting app:", err);
    }

    // Event Listeners
    btnAdd.addEventListener('click', () => {
        openModalForCreate();
    });

    // New Listener for All Classes
    const btnAllClasses = document.getElementById('btnAllClasses');
    if (btnAllClasses) {
        btnAllClasses.addEventListener('click', (e) => {
            e.preventDefault();
            openAllClassesModal();
        });
    }

    btnClose.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
        const deleteModal = document.getElementById('deleteModal');
        if (e.target === deleteModal) closeDeleteModal();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSchedule();
    });

    dateNavPrev.addEventListener('click', () => changeMonth(-1));
    dateNavNext.addEventListener('click', () => changeMonth(1));

    function renderApp() {
        renderCalendar();
        renderTimeline();
        renderScheduleGrid();
        updateHeaderDates();
        renderDayHighlights();
    }

    function renderDayHighlights() {
        const container = document.getElementById('dayHighlights');
        if (!container) return;
        container.innerHTML = '';

        const dateStr = formatDate(state.selectedDate);
        const daySchedules = getSchedulesForDate(state.selectedDate);

        let hasPTM = false;
        let hasHoliday = false;
        let upcomingClasses = [];

        const now = new Date();
        const isToday = state.selectedDate.toDateString() === now.toDateString();

        // Check PTM
        if (daySchedules.some(s => s.isPTM || (s.sessionInfo && s.sessionInfo.status === 'ptm'))) {
            hasPTM = true;
        }

        // Check Upcoming Classes (Next 1 Hour)
        if (isToday) {
            daySchedules.forEach(s => {
                // Ensure startTime exists
                if (s.sessionInfo && s.sessionInfo.status === 'upcoming' && s.startTime) {
                    // Check exact time
                    const [h, m] = s.startTime.split(':').map(Number);
                    const classTime = new Date(now);
                    classTime.setHours(h, m, 0, 0);

                    const diffMs = classTime - now;
                    const oneHourMs = 60 * 60 * 1000;

                    // If starts in future AND within 1 hour
                    if (diffMs > 0 && diffMs <= oneHourMs) {
                        const diffMins = Math.ceil(diffMs / 60000);
                        upcomingClasses.push({
                            subject: s.subject,
                            timeStr: `${diffMins} Menit Lagi`
                        });
                    }
                }
            });
        }

        // Check Holiday (Cancelled classes on this date)
        // Note: individual class cancellation isn't a "Holiday" per se, but if ALL are cancelled or explicitly marked vacation...
        // For now, let's show "Schedule Modified" or similar if any is cancelled, OR specific Holiday flag if we had one.
        // User asked for "Kelasnya lagi libur".
        // Let's check if any class on this day is cancelled.
        // Better: Check if there's a recurring schedule that SHOULD be today but is cancelled.

        // Actually, getSchedulesForDate FILTERS OUT cancelled classes. 
        // So we need to check state.cancelledClasses directly for this date.
        // But cancelledClasses key is UniqueID. We need to find if ANY uniqueID matching today is in cancelledClasses.

        // Check Holiday (Cancelled classes on this date)
        // CHECK IF state.recurringSchedules EXISTS before filtering
        if (state.recurringSchedules) {
            const dayOfWeek = state.selectedDate.getDay();
            // Use map to preserve original index
            state.recurringSchedules.map((s, index) => ({ ...s, originalIndex: index }))
                .filter(s => s.dayParams === dayOfWeek && !s.deleted)
                .forEach(s => {
                    const uniqueId = `${dateStr}-recurring-${s.originalIndex}`; // Use original index
                    if (state.cancelledClasses[uniqueId]) {
                        hasHoliday = true; // At least one class is cancelled/holiday
                    }
                });
        }

        if (hasPTM) {
            const div = document.createElement('div');
            div.className = 'highlight-item highlight-ptm';
            div.innerHTML = '<i class="fas fa-users-cog"></i> Parent Teacher Meeting';
            container.appendChild(div);
        }

        if (hasHoliday) {
            const div = document.createElement('div');
            div.className = 'highlight-item highlight-holiday';
            div.innerHTML = '<i class="fas fa-calendar-times"></i> Kelas Diliburkan';
            container.appendChild(div);
        }

        upcomingClasses.forEach(item => {
            const div = document.createElement('div');
            div.className = 'highlight-item highlight-upcoming';
            div.innerHTML = `<i class="fas fa-bell"></i> ${item.subject} (${item.timeStr})`;
            container.appendChild(div);
        });
    }

    function updateHeaderDates() {
        const options = { month: 'long', year: 'numeric' };
        scheduleMonthYear.textContent = state.currentDate.toLocaleDateString('id-ID', options);
        // currentMonthYear.textContent = state.currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const dayName = state.selectedDate.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
        const dayDate = state.selectedDate.getDate();
        const fullDayName = state.selectedDate.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
        selectedDateDisplay.textContent = `${dayName.substring(0, 3)} ${dayDate}, ${fullDayName}`;
    }

    function changeMonth(delta) {
        state.currentDate.setMonth(state.currentDate.getMonth() + delta);
        renderApp();
    }

    function calculateSessionInfo(schedule, targetDate) {
        if (!schedule.isRecurring || !schedule.startDate) return null;

        // Determine effective start date and sibling schedules
        let effectiveStartDate = new Date(schedule.startDate);
        let siblings = [];

        if (schedule.groupId) {
            // Find all siblings in this group
            siblings = state.recurringSchedules
                .map((s, i) => ({ ...s, originalId: i }))
                .filter(s => s.groupId === schedule.groupId && !s.deleted);

            // Find earliest start date in the group to define the "Series Start"
            siblings.forEach(s => {
                const sDate = new Date(s.startDate);
                if (sDate < effectiveStartDate) effectiveStartDate = sDate;
            });
        } else {
            // Single schedule, treat as only child
            siblings = [schedule];
        }

        const target = new Date(targetDate);

        // Normalize time to midnight
        effectiveStartDate.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);

        // if (target < effectiveStartDate) return { current: 'Belum Mulai', remaining: state.totalSessions, status: 'upcoming' };
        // User requested to remove this status. Even if before start date, just return 0/24 or let it count naturally (which will be 0)


        // Check if TARGET date itself is PTM (using the schedule's own ID)
        const targetDateStr = formatDate(target);
        const targetUniqueId = `${targetDateStr}-recurring-${schedule.originalId}`;
        if (state.overrides[targetUniqueId] && state.overrides[targetUniqueId].isPTM) {
            return { status: 'ptm' };
        }

        // Count occurrences
        let count = 0;
        let d = new Date(effectiveStartDate);

        // Loop from start date up to target date
        while (d <= target) {
            const dayOfWeek = d.getDay();

            // Find which sibling schedule corresponds to this day (if any)
            const matchingSiblings = siblings.filter(s => s.dayParams === dayOfWeek);

            matchingSiblings.forEach(match => {
                // Only process if date is >= match's specific start date
                const matchStartDate = new Date(match.startDate);
                matchStartDate.setHours(0, 0, 0, 0);

                if (d >= matchStartDate) {
                    const dStr = formatDate(d);
                    const uniqueId = `${dStr}-recurring-${match.originalId}`;

                    // Check cancellation
                    const isCancelled = state.cancelledClasses[uniqueId];

                    // Check PTM
                    const override = state.overrides[uniqueId];
                    const isPTM = override && override.isPTM;

                    if (!isCancelled && !isPTM) {
                        count++;
                    }
                }
            });

            d.setDate(d.getDate() + 1);
        }

        const remaining = Math.max(0, state.totalSessions - count);

        return {
            current: count,
            total: state.totalSessions,
            remaining: remaining,
            status: count > state.totalSessions ? 'finished' : 'ongoing'
        };
    }

    function getSchedulesForDate(date) {
        const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
        const dateStr = formatDate(date);

        // 1. Get recurring schedules for this day
        const recurring = (state.recurringSchedules || [])
            .map((item, index) => ({ ...item, originalId: index })) // Keep index for ID generation
            .filter(item => item.dayParams === dayOfWeek && !item.deleted) // FILER DELETED
            .map((item) => {
                const index = item.originalId;
                const baseId = `recurring-${index}`;
                const uniqueId = `${dateStr}-${baseId}`;

                // Construct a temporary schedule object to pass to calculator
                const tempSched = {
                    ...item,
                    originalId: index,
                    originalDayParams: item.dayParams,
                    isRecurring: true
                };

                const sessionInfo = calculateSessionInfo(tempSched, dateStr);

                // Check for override
                if (state.overrides[uniqueId]) {
                    return { ...state.overrides[uniqueId], sessionInfo, startDate: item.startDate };
                }

                return {
                    id: baseId,
                    originalId: index,
                    subject: item.subject,
                    instructor: item.instructor, // FIXED: Removed hardcoded 'Ms./Mr. Teacher'
                    room: item.room, // FIXED: Removed hardcoded 'Room ' + ...
                    startTime: item.start,
                    endTime: item.end,
                    color: item.color,
                    isRecurring: true,
                    date: dateStr,
                    uniqueId: uniqueId,
                    startDate: item.startDate,
                    sessionInfo: sessionInfo
                };
            })
            // Filter out finished classes (Session > 24) AND upcoming classes
            .filter(schedule => {
                if (schedule.sessionInfo) {
                    if (schedule.sessionInfo.status === 'finished') return false;
                    // if (schedule.sessionInfo.status === 'upcoming') return false; 

                    // Filter if 0 sessions (not started yet vs effective date)
                    if (schedule.sessionInfo.current === 0) return false;
                }
                return true;
            });

        // 2. Get custom schedules
        const custom = state.customSchedules.filter(s => s.date === dateStr).map(s => {
            const uniqueId = `${s.date}-${s.id}`;
            return {
                ...s,
                uniqueId: uniqueId,
                sessionInfo: null // Custom classes don't track 24 sessions usually
            };
        });

        // 3. Combine and filter out cancelled
        const allSchedules = [...recurring, ...custom].filter(s => {
            return !state.cancelledClasses[s.uniqueId];
        });

        return allSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    function renderCalendar() {
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        if (!miniCalendar) return;

        miniCalendar.innerHTML = '';

        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            miniCalendar.appendChild(div);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.textContent = i;

            if (year === state.selectedDate.getFullYear() &&
                month === state.selectedDate.getMonth() &&
                i === state.selectedDate.getDate()) {
                div.classList.add('active');
            }

            div.addEventListener('click', () => {
                state.selectedDate = new Date(year, month, i);
                renderApp();
            });

            miniCalendar.appendChild(div);
        }
    }

    function renderTimeline() {
        timeline.innerHTML = '';

        const daysSchedules = getSchedulesForDate(state.selectedDate);

        if (daysSchedules.length === 0) {
            timeline.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">Tidak ada jadwal</div>';
            return;
        }

        daysSchedules.forEach(schedule => {
            const card = document.createElement('div');
            card.className = 'timeline-card';
            card.style.backgroundColor = schedule.color;
            // Removed borderLeft, using improved card styling

            let sessionDisplay = '';

            // Check PTM directly from schedule object (if it's an override) or from sessionInfo status
            const isPTM = schedule.isPTM || (schedule.sessionInfo && schedule.sessionInfo.status === 'ptm');

            function getSyllabusMaterial(sessionNumber) {
                if (sessionNumber >= 1 && sessionNumber <= 7) {
                    return `A.${sessionNumber}`;
                } else if (sessionNumber >= 8 && sessionNumber <= 14) {
                    return `B.${sessionNumber - 7}`;
                } else if (sessionNumber >= 15 && sessionNumber <= 21) {
                    return `C.${sessionNumber - 14}`;
                } else if (sessionNumber >= 22 && sessionNumber <= 24) {
                    return `Post ${sessionNumber - 21}`;
                }
                return '';
            }

            // Inside renderTimeline loop...
            if (isPTM) {
                // PTM Styles
                sessionDisplay = `
                    <div class="session-info" style="background: rgba(255,255,255,0.7); color: #e67e22; border: 1px solid #e67e22;">
                        <i class="fas fa-users-cog"></i> Parent Teacher Meeting (PTM)
                    </div>
                `;
            } else if (schedule.sessionInfo) {
                if (schedule.sessionInfo.status === 'upcoming') {
                    sessionDisplay = `<div class="session-info">Kelas Belum Dimulai</div>`;
                } else if (schedule.sessionInfo.status === 'finished') {
                    sessionDisplay = `<div class="session-info">Kelas Selesai</div>`;
                } else {
                    const material = getSyllabusMaterial(schedule.sessionInfo.current);
                    sessionDisplay = `
                        <div class="session-info">
                            <span>Pertemuan ${schedule.sessionInfo.current} / 24</span>
                            <span style="font-weight:bold; color: #555;">Materi: ${material}</span>
                        </div>
                    `;
                }
            }

            card.innerHTML = `
                <div class="time-range">${schedule.startTime} - ${schedule.endTime}</div>
                <div class="instructor-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(schedule.instructor)}&background=random" class="instructor-avatar">
                    <div class="instructor-details">
                        <h4>${schedule.instructor}</h4>
                        <p>${schedule.subject}</p>
                    </div>
                </div>
                <div class="room-info">
                    <span>${schedule.room}</span>
                </div>
                ${sessionDisplay}
                <!-- Actions -->
                <div style="position: absolute; top: 15px; right: 15px; display:flex; gap:10px;">
                     <div style="cursor: pointer; color: rgba(0,0,0,0.5);" onclick="window.editClass('${schedule.uniqueId}')" title="Edit Kelas">
                        <i class="fas fa-pencil-alt"></i>
                    </div>
                    <div style="cursor: pointer; color: #e74c3c;" onclick="window.cancelClass('${schedule.uniqueId}')" title="Hapus Jadwal">
                        <i class="fas fa-trash-alt"></i>
                    </div>
                </div>
            `;
            timeline.appendChild(card);
        });
    }

    // Delete modal vars
    window.cancelClass = function (uniqueId) {
        state.deletingId = uniqueId;
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) deleteModal.style.display = 'flex';
    };

    window.closeDeleteModal = function () {
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) deleteModal.style.display = 'none';
        state.deletingId = null;
    };

    window.confirmDelete = function (mode) {
        if (!state.deletingId) return;

        if (mode === 'single') {
            // "Liburkan" logic (Hanya sesi ini)
            state.cancelledClasses[state.deletingId] = true;
        } else if (mode === 'all') {
            // Delete entire recurring series or custom schedule
            if (state.deletingId.includes('recurring')) {
                const parts = state.deletingId.split('-');
                // Format: YYYY-MM-DD-recurring-INDEX
                // The index is the last part
                const index = parseInt(parts[parts.length - 1]);

                if (!isNaN(index) && state.recurringSchedules[index]) {
                    const targetSchedule = state.recurringSchedules[index];

                    if (targetSchedule.groupId) {
                        // Delete ALL linked schedules int the same group
                        state.recurringSchedules.forEach(s => {
                            if (s.groupId === targetSchedule.groupId) {
                                s.deleted = true;
                            }
                        });
                    } else {
                        // Mark just this one as deleted
                        targetSchedule.deleted = true;
                    }
                }
            } else if (state.deletingId.includes('custom')) {
                const parts = state.deletingId.split('-');
                // Format: YYYY-MM-DD-custom-TIMESTAMP
                const customId = parts.slice(3).join('-');
                const idx = state.customSchedules.findIndex(s => s.id === customId);
                if (idx > -1) {
                    state.customSchedules.splice(idx, 1);
                }
            }
        }

        saveStateToStorage(); // Persist changes
        renderApp();
        closeDeleteModal();
    };

    window.editClass = function (uniqueId) {
        const schedules = getSchedulesForDate(state.selectedDate);
        const schedule = schedules.find(s => s.uniqueId === uniqueId);
        const dayMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 }; // Moved up

        if (!schedule) return;

        state.editingId = uniqueId;

        if (modalTitle) modalTitle.textContent = "Edit Jadwal";
        if (btnSubmit) btnSubmit.textContent = "Simpan Perubahan";

        document.getElementById('subjectInput').value = schedule.subject;
        document.getElementById('instructorInput').value = schedule.instructor;
        document.getElementById('roomInput').value = schedule.room; // FIXED: Removed .replace()
        document.getElementById('startDateInput').value = schedule.startDate || formatDate(state.selectedDate);
        document.getElementById('timeInput').value = schedule.startTime;

        // PTM Checkbox state
        const isPTM = schedule.isPTM || (schedule.sessionInfo && schedule.sessionInfo.status === 'ptm');
        const ptmCheckbox = document.getElementById('ptmInput');
        if (ptmCheckbox) ptmCheckbox.checked = !!isPTM;

        // Render Color Picker with existing color
        renderColorPicker(schedule.color);

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        document.getElementById('dayInput').value = days[state.selectedDate.getDay()]; // Or use schedule.dayParams if available

        // Reset Day 2 inputs
        const day2Row = document.getElementById('day2Row');
        const dayInput2 = document.getElementById('dayInput2');
        const timeInput2 = document.getElementById('timeInput2');
        if (dayInput2) dayInput2.value = "";
        if (timeInput2) timeInput2.value = "";

        // Check for Sibling (Group ID)
        if (schedule.isRecurring) {
            const originalIndex = schedule.originalId;
            const currentRec = state.recurringSchedules[originalIndex];

            if (currentRec && currentRec.groupId) {
                // Find sibling
                const sibling = state.recurringSchedules.find((s, i) => s.groupId === currentRec.groupId && i !== originalIndex && !s.deleted);

                if (sibling) {
                    if (day2Row) day2Row.style.display = 'flex';
                    if (dayInput2) {
                        // Reverse lookup day name
                        const dayName = Object.keys(dayMap).find(key => dayMap[key] === sibling.dayParams);
                        if (dayName) dayInput2.value = dayName;
                    }
                    if (timeInput2) timeInput2.value = sibling.start;
                } else {
                    if (day2Row) day2Row.style.display = 'none';
                }
            } else {
                if (day2Row) day2Row.style.display = 'none';
            }
        } else {
            if (day2Row) day2Row.style.display = 'none';
        }

        // Helper map needs to be available or redefined if scope issue
        // defined inside saveNewSchedule but not here. Let's define it or move it up.
        // For now, assuming standard days array is enough for Day 1, but Day 2 needs map.
        // Let's rely on the global days array if needed, but here we need to map INT to STRING.
        modal.style.display = 'flex';
    };

    function openModalForCreate() {
        state.editingId = null;
        if (modalTitle) modalTitle.textContent = "Tambah Jadwal Baru";
        if (btnSubmit) btnSubmit.textContent = "Simpan Jadwal";
        form.reset();

        document.getElementById('startDateInput').value = formatDate(state.selectedDate);

        const ptmCheckbox = document.getElementById('ptmInput');
        if (ptmCheckbox) ptmCheckbox.checked = false;

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        document.getElementById('dayInput').value = days[state.selectedDate.getDay()];

        // Render Color Picker (random default)
        renderColorPicker();

        // Show Day 2 Row
        const day2Row = document.getElementById('day2Row');
        if (day2Row) {
            day2Row.style.display = 'flex';
        }

        modal.style.display = 'flex';
    }

    function renderScheduleGrid() {
        scheduleGrid.innerHTML = '';

        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // Sunday=0
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = ['MING', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
        days.forEach(d => {
            const header = document.createElement('div');
            header.className = 'grid-header';
            header.innerHTML = `<div class="grid-header-day">${d}</div>`;
            scheduleGrid.appendChild(header);
        });

        let dateCounter = 1;

        for (let i = 0; i < 42; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';

            if (i < firstDayOfMonth) {
                cell.innerHTML = ``;
            } else if (dateCounter <= daysInMonth) {
                const currentFnDateCounter = dateCounter;
                const cellDate = new Date(year, month, currentFnDateCounter);

                let dateHtml = `<span class="grid-date-display">${currentFnDateCounter}</span>`;

                if (cellDate.getTime() === state.selectedDate.getTime()) {
                    dateHtml = `<span class="grid-date-display active">${currentFnDateCounter}</span>`;
                }

                let contentHtml = dateHtml;

                const daySchedules = getSchedulesForDate(cellDate);
                const count = daySchedules.length;

                if (count > 0) {
                    let indicatorsHtml = '<div style="display:flex; gap:3px; margin-top:auto; flex-wrap:wrap; justify-content:center;">';
                    for (let k = 0; k < Math.min(count, 4); k++) {
                        indicatorsHtml += `<div style="width:6px; height:6px; border-radius:50%; background-color:${daySchedules[k].color};"></div>`;
                    }
                    indicatorsHtml += '</div>';
                    contentHtml += indicatorsHtml;
                }

                cell.innerHTML = contentHtml;

                cell.addEventListener('click', () => {
                    state.selectedDate = new Date(year, month, currentFnDateCounter);
                    renderApp();
                });

                dateCounter++;
            } else {
                let nextMonthDay = dateCounter - daysInMonth;
                cell.innerHTML = `<span style="color: #eee;">${nextMonthDay}</span>`;
                dateCounter++;
            }

            scheduleGrid.appendChild(cell);
        }
    }

    function saveSchedule() {
        // Just prepare data, actual save happens in confirmSave if it's an edit
        // For new schedules, save directly

        if (!state.editingId) {
            // New Schedule - Save directly
            saveNewSchedule();
        } else {
            // Check if ONLY color changed
            const schedules = getSchedulesForDate(state.selectedDate);
            const original = schedules.find(s => s.uniqueId === state.editingId);

            if (original) {
                const newSubject = document.getElementById('subjectInput').value;
                const newInstructor = document.getElementById('instructorInput').value;
                const newRoom = document.getElementById('roomInput').value;
                const newStartTime = document.getElementById('timeInput').value;
                const newPtm = document.getElementById('ptmInput').checked;
                const newColor = document.getElementById('colorInput').value;

                const isSubjectSame = original.subject === newSubject;
                const isInstructorSame = original.instructor === newInstructor;
                const isRoomSame = original.room === newRoom;
                const isTimeSame = original.startTime === newStartTime;
                // PTM logic: original has isPTM property
                // But wait, original.isPTM might be undefined if false
                const originalPTM = !!(original.isPTM || (original.sessionInfo && original.sessionInfo.status === 'ptm'));
                const isPtmSame = originalPTM === newPtm;

                const isColorChanged = original.color !== newColor;

                if (isSubjectSame && isInstructorSame && isRoomSame && isTimeSame && isPtmSame && isColorChanged) {
                    // ONLY color changed!
                    // Directly save to ALL sessions (update master)
                    confirmSave('all');
                    return;
                }
            }

            // Editing existing
            // Show confirmation modal
            const saveModal = document.getElementById('saveConfirmationModal');
            if (saveModal) saveModal.style.display = 'flex';
        }
    }

    function saveNewSchedule() {
        const subject = document.getElementById('subjectInput').value;
        const instructor = document.getElementById('instructorInput').value;
        const room = document.getElementById('roomInput').value;
        const startTime1 = document.getElementById('timeInput').value;

        const ptmCheckbox = document.getElementById('ptmInput');

        // Helper to calculate end time (fixed 90 mins for now)
        const getEndTime = (startT) => {
            const [h, m] = startT.split(':').map(Number);
            const d = new Date();
            d.setHours(h);
            d.setMinutes(m + 90);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const endTime1 = getEndTime(startTime1);

        // CREATE NEW RECURRING
        const dayName1 = document.getElementById('dayInput').value;
        const day2El = document.getElementById('dayInput2');
        const dayName2 = day2El ? day2El.value : "";

        const timeInput2 = document.getElementById('timeInput2');
        let startTime2 = timeInput2 ? timeInput2.value : "";

        // Default Time 2 to Time 1 if empty
        if (!startTime2) startTime2 = startTime1;

        const dayMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

        const colorPalette = [
            '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9',
            '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9',
            '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2',
            '#FFCCBC', '#D7CCC8', '#F5F5F5', '#CFD8DC', '#FFAB91'
        ];

        // Use selected color or random if not selected (though UI enforces implementation now)
        const selectedColorInput = document.getElementById('colorInput');
        let scheduleColor = selectedColorInput && selectedColorInput.value ? selectedColorInput.value : colorPalette[Math.floor(Math.random() * colorPalette.length)];

        // Check if subject already exists to reuse color
        const existingSchedule = state.recurringSchedules.find(s => s.subject.trim().toLowerCase() === subject.trim().toLowerCase() && !s.deleted);
        if (existingSchedule) {
            scheduleColor = existingSchedule.color;
        }

        const startDateInput = document.getElementById('startDateInput').value;
        const startDateStr = startDateInput ? startDateInput : formatDate(state.selectedDate);

        // Generate Group ID if 2 days are selected
        const groupId = (dayName2 && dayName2 !== dayName1) ? 'group-' + Date.now() : undefined;

        // Add Day 1
        state.recurringSchedules.push({
            dayParams: dayMap[dayName1],
            subject,
            instructor,
            room: room.startsWith('Room') ? room : 'Room ' + room,
            start: startTime1,
            end: endTime1,
            color: scheduleColor,
            startDate: startDateStr,
            groupId: groupId
        });

        // Add Day 2 if selected
        if (dayName2 && dayName2 !== dayName1 && dayMap[dayName2] !== undefined) {
            const endTime2 = getEndTime(startTime2);
            state.recurringSchedules.push({
                dayParams: dayMap[dayName2],
                subject,
                instructor,
                room: room.startsWith('Room') ? room : 'Room ' + room,
                start: startTime2,
                end: endTime2,
                color: scheduleColor,
                startDate: startDateStr,
                groupId: groupId
            });
        }

        saveStateToStorage(); // Persist changes
        renderApp();
        modal.style.display = 'none';
        form.reset();
    }

    // Modal logic for Save Confirmation
    window.closeSaveConfirmationModal = function () {
        const modal = document.getElementById('saveConfirmationModal');
        if (modal) modal.style.display = 'none';
    };

    window.confirmSave = function (mode) {
        try {
            console.log("Attempting to save with mode:", mode, "EditingID:", state.editingId);

            const subject = document.getElementById('subjectInput').value;
            const instructor = document.getElementById('instructorInput').value;
            const room = document.getElementById('roomInput').value;
            const startTime = document.getElementById('timeInput').value;
            const ptmCheckbox = document.getElementById('ptmInput');
            const isPTM = ptmCheckbox ? ptmCheckbox.checked : false;

            const [h, m] = startTime.split(':').map(Number);
            const d = new Date();
            d.setHours(h);
            d.setMinutes(m + 90);
            const endTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

            if (state.editingId.includes('recurring')) {
                if (mode === 'single') {
                    // OVERRIDE LOGIC (Hanya Sesi Ini)
                    const dateStr = formatDate(state.selectedDate);

                    // Inherit color from original/existing override first
                    let overrideColor = '#E0F7FA'; // Default
                    const original = getSchedulesForDate(state.selectedDate).find(s => s.uniqueId === state.editingId);
                    if (original && original.color) {
                        overrideColor = original.color;
                    } else {
                        const parts = state.editingId.split('-');
                        const baseIdx = parseInt(parts[parts.length - 1]);
                        if (!isNaN(baseIdx) && state.recurringSchedules[baseIdx]) {
                            overrideColor = state.recurringSchedules[baseIdx].color;
                        }
                    }

                    // Use new color if user changed it
                    const selectedColorInput = document.getElementById('colorInput');
                    if (selectedColorInput && selectedColorInput.value) {
                        overrideColor = selectedColorInput.value;
                    }

                    state.overrides[state.editingId] = {
                        id: state.editingId.split('-').slice(3).join('-'),
                        uniqueId: state.editingId,
                        subject,
                        instructor,
                        room: room,
                        startTime,
                        endTime,
                        color: overrideColor,
                        date: dateStr,
                        isRecurring: true,
                        isPTM: isPTM
                    };

                    // CRITICAL: Even if single override, if color changed in UI, update MASTER color too
                    const colorInputElRef = document.getElementById('colorInput');
                    if (colorInputElRef && colorInputElRef.value) {
                        const parts = state.editingId.split('-');
                        const baseIdx = parseInt(parts[parts.length - 1]);
                        if (!isNaN(baseIdx) && state.recurringSchedules[baseIdx]) {
                            state.recurringSchedules[baseIdx].color = colorInputElRef.value;
                        }
                    }
                } else if (mode === 'all') {
                    // UPDATE MASTER LOGIC (Semua Sesi)
                    const parts = state.editingId.split('-');
                    // Format: YYYY-MM-DD-recurring-INDEX
                    const index = parseInt(parts[parts.length - 1]);

                    console.log("Saving ALL. Index:", index);

                    if (!isNaN(index) && state.recurringSchedules[index]) {
                        // Update master schedule
                        const master = state.recurringSchedules[index];
                        master.subject = subject;
                        master.instructor = instructor;
                        master.room = room;
                        master.start = startTime;
                        master.end = endTime;

                        // FIX: Update Day if changed
                        const dayInput = document.getElementById('dayInput');
                        const dayMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
                        if (dayInput && dayMap[dayInput.value] !== undefined) {
                            master.dayParams = dayMap[dayInput.value];
                        }

                        // Use new color if user changed it
                        const colorInputEl = document.getElementById('colorInput');
                        if (colorInputEl && colorInputEl.value) {
                            master.color = colorInputEl.value;
                        }

                        // Update Sibling (Day 2) if exists
                        if (master.groupId) {
                            const day2El = document.getElementById('dayInput2');
                            const timeInput2 = document.getElementById('timeInput2');

                            if (day2El && timeInput2 && day2El.value && timeInput2.value) {
                                const siblingIndex = state.recurringSchedules.findIndex((s, i) => s.groupId === master.groupId && i !== index && !s.deleted);

                                if (siblingIndex > -1) {
                                    const sibling = state.recurringSchedules[siblingIndex];
                                    // Reuse dayMap
                                    sibling.subject = subject;
                                    sibling.instructor = instructor;
                                    sibling.room = room;
                                    if (dayMap[day2El.value] !== undefined) {
                                        sibling.dayParams = dayMap[day2El.value];
                                    }
                                    sibling.start = timeInput2.value;

                                    // Recalculate end time for sibling
                                    const [h2, m2] = sibling.start.split(':').map(Number);
                                    const d2 = new Date();
                                    d2.setHours(h2);
                                    d2.setMinutes(m2 + 90);
                                    sibling.end = `${String(d2.getHours()).padStart(2, '0')}:${String(d2.getMinutes()).padStart(2, '0')}`;

                                    // Update Sibling Color too
                                    if (colorInputEl && colorInputEl.value) {
                                        sibling.color = colorInputEl.value;
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (state.editingId.includes('custom')) {
                // Custom schedules are single anyway
                const parts = state.editingId.split('-');
                if (parts.length >= 5) {
                    const customId = parts.slice(3).join('-');
                    const scheduleIdx = state.customSchedules.findIndex(s => s.id === customId);

                    if (scheduleIdx > -1) {
                        state.customSchedules[scheduleIdx] = {
                            ...state.customSchedules[scheduleIdx],
                            subject,
                            instructor,
                            room: room,
                            startTime,
                            endTime,
                            isPTM: isPTM
                        };
                    }
                }
            }

            saveStateToStorage(); // Persist changes
            renderApp();
            closeSaveConfirmationModal();
            modal.style.display = 'none';
            form.reset();

        } catch (error) {
            console.error("Critical error in confirmSave:", error);
            alert("Terjadi kesalahan saat menyimpan jadwal. Silakan coba lagi.");
            // Determine if we should close modal or keep it open for user to retry?
            // Usually valid to close and reload to safe state.
            closeSaveConfirmationModal();
        }
    }

    // Real-time updates every minute
    setInterval(() => {
        // Only if we are viewing "Today" (or selected date is today) to update highlights
        // or actually, highlights depend on selected date. If selected date is today, we must update.
        // If selected date is NOT today, upcoming highlights won't show anyway, but PTM/Holiday might not change.
        // It's safe to just re-render highlights.
        renderDayHighlights();
    }, 60000); // 1 minute

    // Global functions for modal
    window.closeAllClassesModal = function () {
        const m = document.getElementById('allClassesModal');
        if (m) m.style.display = 'none';
    }

    function openAllClassesModal() {
        console.log("Opening All Classes Modal...");
        const m = document.getElementById('allClassesModal');
        const list = document.getElementById('allClassesList');
        console.log("Modal el:", m, "List el:", list);

        if (!m || !list) {
            console.error("Missing modal elements!");
            return;
        }

        list.innerHTML = '';

        // Get unique classes (filter deleted)
        // We want to show distinct recurring entries. 
        // If a class has 2 days (Mon/Thu), better show them as 1 card with "Mon & Thu"? or 2 cards?
        // User request was "all information all classes".
        // Let's show separate cards for clarity on timing, or grouped. 
        // List separate entries is easiest and accurate.

        const activeClasses = state.recurringSchedules.filter(s => !s.deleted);

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        // Sort: Day -> Time
        activeClasses.sort((a, b) => {
            if (a.dayParams !== b.dayParams) return a.dayParams - b.dayParams;
            return a.start.localeCompare(b.start);
        });

        activeClasses.forEach(s => {
            const dayName = days[s.dayParams];
            const item = document.createElement('div');
            item.className = 'all-class-item';
            item.style.borderLeft = `4px solid ${s.color}`;

            // Initials for avatar
            const initials = s.instructor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            item.innerHTML = `
                <div class="ac-header">
                    <div class="ac-subject">${s.subject}</div>
                    <div class="ac-room">${s.room}</div>
                </div>
                <div class="ac-day-time">
                    <i class="far fa-clock"></i> ${dayName}, ${s.start} - ${s.end}
                </div>
                <div class="ac-instructor">
                    <div class="ac-avatar" style="background-color: ${s.color}20; color: ${s.color}">
                        ${initials}
                    </div>
                    <div class="ac-instructor-name">${s.instructor}</div>
                </div>
             `;

            // Optional: Make it clickable to Edit?
            // User just said "muncul informasi", didn't strictly say edit. 
            // But usually clicking opens edit. Let's make it open edit for convenience.
            item.style.cursor = 'pointer';
            item.onclick = () => {
                closeAllClassesModal();
                // We need a UniqueID to edit. But 'editClass' expects a UniqueID formed by Date+RecurringID.
                // This is a generic list. 
                // We can construct a "fake" unique ID using TODAY's date (or next occurrence date) just to open the editor?
                // Actually `editClass` uses uniqueId to find the specific instance for that date to see overrides.
                // But for editing the MASTER schedule, any valid ID pointing to this index works.
                // Let's find the NEXT occurrence date to use as a handle.

                // However, `editClass` logic relies on `getSchedulesForDate` finding it.
                // Simplest is to just show info for now. If user wants to edit, they go to schedule.
                // Doing nothing is safer than hacking the edit mode.
            };

            list.appendChild(item);
        });

        m.style.display = 'flex';
    }
});

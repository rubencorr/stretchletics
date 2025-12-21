// Shared calendar renderer used by trainingplan and user preview
// renderWizardCalendar(container, plan, startDate, opts)
(function () {
  function mapWorkouts(plan, startDate) {
    const workoutMap = {};
    let currentDate = new Date(startDate);
    plan.weeks.forEach(week => {
      if (!week.days) return;
      week.days.forEach(day => {
        const key = currentDate.toISOString().split('T')[0];
        workoutMap[key] = day.workouts;
        currentDate.setDate(currentDate.getDate() + 1);
      });
    });
    return workoutMap;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderWizardCalendar(container, plan, startDate, opts = {}) {
    if (!container) return;
    if (!plan || !plan.weeks || !Array.isArray(plan.weeks) || plan.weeks.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-400">No plan data available to render.</p>';
      return;
    }

    const workoutsByDate = mapWorkouts(plan, startDate);
    let modalCurrentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    function changeMonthModal(delta) {
      modalCurrentMonth.setMonth(modalCurrentMonth.getMonth() + delta);
      updateModalCalendar();
    }
    function jumpToCurrentMonthModal() {
      const today = new Date();
      modalCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      updateModalCalendar();
    }

    function updateModalCalendar() {
      const year = modalCurrentMonth.getFullYear();
      const month = modalCurrentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday-first

      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      let html = `<div class="calendar-container">
        <div class="calendar-header">
          <button class="calendar-nav-btn" data-action="prev"><i class="fas fa-chevron-left"></i> Previous</button>
          <div class="flex items-center gap-3">
            <h3 class="text-2xl font-black text-white">${monthNames[month]} ${year}</h3>
            <button class="calendar-nav-btn" data-action="today"><i class="fas fa-calendar-day"></i> Today</button>
          </div>
          <div class="flex items-center gap-3">
            <button class="calendar-nav-btn" data-action="next">Next <i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
        <div class="calendar-grid">`;

      const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      html += weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('');
      html += '<div class="calendar-weekday">Week Summary</div>';

      // padding
      for (let i=0;i<startingDayOfWeek;i++) html += '<div class="calendar-day-cell" style="opacity:0; pointer-events:none;"></div>';

      let weekNumber = 0;
      let daysInCurrentWeek = startingDayOfWeek;
      let weekDistance = 0;
      let weekDuration = 0;

      for (let dayOfMonth=1; dayOfMonth<=daysInMonth; dayOfMonth++) {
        const currentDate = new Date(year, month, dayOfMonth);
        const dateStr = currentDate.toISOString().split('T')[0];
        const workout = workoutsByDate[dateStr];

        if (workout) {
          const stats = (typeof window.extractWorkoutStats === 'function') ? window.extractWorkoutStats(workout) : {distance:0,duration:0};
          weekDistance += stats.distance;
          weekDuration += stats.duration;
        }

        const workoutName = workout ? (typeof window.extractWorkoutName === 'function' ? window.extractWorkoutName(workout) : (Array.isArray(workout)?workout[0]:(workout||'')).toString().slice(0,40)) : '';
        const intensity = (workout && workout[0]) ? (typeof window.detectIntensity === 'function' ? window.detectIntensity(workout[0]) : null) : null;
        const displayIntensity = intensity ? (intensity.toLowerCase()==='recovery' ? 'Recovery' : intensity.charAt(0).toUpperCase()+intensity.slice(1)) : null;
        const today = new Date();
        const isToday = currentDate.getDate() === today.getDate() && currentDate.getMonth()===today.getMonth() && currentDate.getFullYear()===today.getFullYear();
        const planStart = new Date(startDate);
        const totalDays = plan.weeks.reduce((s,w)=>s+(w.days?w.days.length:0),0);
        const planEnd = new Date(startDate);
        planEnd.setDate(planEnd.getDate() + totalDays - 1);
        const isWithinPlan = currentDate >= planStart && currentDate <= planEnd;

        const workoutsData = workout ? encodeURIComponent(JSON.stringify(workout)) : '';

        html += `
          <div class="calendar-day-cell ${workout ? 'has-workout' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}" ${workout ? `data-workouts='${workoutsData}' style="cursor:pointer;"` : ''}>
            <div class="calendar-day-number">${dayOfMonth}</div>
            ${workout ? `
              <div class="calendar-workout-name">${escapeHtml(workoutName)}</div>
              ${displayIntensity ? `<div class="workout-type-badge workout-type-${intensity}" style="font-size:8px;padding:2px 6px;margin-top:4px;display:inline-block;">${displayIntensity}</div>` : ''}
            ` : (isWithinPlan ? `<div class="calendar-workout-name" style="color:#64748b;font-size:10px;font-weight:600;">Recovery</div><div class="workout-type-badge workout-type-recovery" style="font-size:8px;padding:2px 6px;margin-top:4px;display:inline-block;">Recovery</div>` : '')}
          </div>
        `;

        daysInCurrentWeek++;
        if (daysInCurrentWeek === 7) {
          weekNumber++;
          html += `
            <div class="week-summary">
              <div class="week-summary-title">Week ${weekNumber}</div>
              ${weekDistance>0?`<div class="week-summary-stat"><span class="week-summary-label">Distance:</span><span class="week-summary-value">${weekDistance.toFixed(1)}km</span></div>`:''}
              ${weekDuration>0?`<div class="week-summary-stat"><span class="week-summary-label">Duration:</span><span class="week-summary-value">${Math.round(weekDuration)}min</span></div>`:''}
              ${weekDistance===0 && weekDuration===0?`<div class="week-summary-stat"><span class="week-summary-label">Rest Week</span></div>`:''}
            </div>
          `;
          daysInCurrentWeek = 0; weekDistance=0; weekDuration=0;
        }
      }

      // fill remaining days
      if (daysInCurrentWeek > 0) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        let nextDayOfMonth = 1;
        while (daysInCurrentWeek < 7) {
          const currentDate = new Date(nextYear, nextMonth, nextDayOfMonth);
          const dateStr = currentDate.toISOString().split('T')[0];
          const workout = workoutsByDate[dateStr];
          if (workout) {
            const stats = (typeof window.extractWorkoutStats === 'function') ? window.extractWorkoutStats(workout) : {distance:0,duration:0};
            weekDistance += stats.distance; weekDuration += stats.duration;
          }
          const workoutName = workout ? (typeof window.extractWorkoutName === 'function' ? window.extractWorkoutName(workout) : (Array.isArray(workout)?workout[0]:(workout||'')).toString().slice(0,40)) : '';
          const intensity = (workout && workout[0]) ? (typeof window.detectIntensity === 'function' ? window.detectIntensity(workout[0]) : null) : null;
          const displayIntensity = intensity ? (intensity.toLowerCase()==='recovery' ? 'Recovery' : intensity.charAt(0).toUpperCase()+intensity.slice(1)) : null;

          const workoutsData = workout ? encodeURIComponent(JSON.stringify(workout)) : '';

          html += `
            <div class="calendar-day-cell ${workout ? 'has-workout' : ''} other-month" data-date="${dateStr}" ${workout ? `data-workouts='${workoutsData}' style="cursor:pointer;"` : ''}>
              <div class="calendar-day-number">${nextDayOfMonth}</div>
              ${workout ? `
                <div class="calendar-workout-name">${escapeHtml(workoutName)}</div>
                ${displayIntensity ? `<div class="workout-type-badge workout-type-${intensity}" style="font-size:8px;padding:2px 6px;margin-top:4px;display:inline-block;">${displayIntensity}</div>` : ''}
              ` : ( (currentDate >= new Date(startDate) && currentDate <= new Date(startDate).setDate(new Date(startDate).getDate()+ (plan.weeks.reduce((s,w)=>s+(w.days?w.days.length:0),0)-1)) ) ? `<div class="calendar-workout-name" style="color:#64748b;font-size:10px;font-weight:600;">Recovery</div><div class="workout-type-badge workout-type-recovery" style="font-size:8px;padding:2px 6px;margin-top:4px;display:inline-block;">Recovery</div>` : '')}
            </div>
          `;

          daysInCurrentWeek++; nextDayOfMonth++;
        }

        weekNumber++;
        html += `
          <div class="week-summary">
            <div class="week-summary-title">Week ${weekNumber}</div>
            ${weekDistance>0?`<div class="week-summary-stat"><span class="week-summary-label">Distance:</span><span class="week-summary-value">${weekDistance.toFixed(1)}km</span></div>`:''}
            ${weekDuration>0?`<div class="week-summary-stat"><span class="week-summary-label">Duration:</span><span class="week-summary-value">${Math.round(weekDuration)}min</span></div>`:''}
            ${weekDistance===0 && weekDuration===0?`<div class="week-summary-stat"><span class="week-summary-label">Rest Week</span></div>`:''}
          </div>
        `;
      }

      html += '</div></div>';

      container.innerHTML = html;

      // wire buttons
      const prevBtn = container.querySelector('[data-action="prev"]');
      const nextBtn = container.querySelector('[data-action="next"]');
      const todayBtn = container.querySelector('[data-action="today"]');
      if (prevBtn) prevBtn.addEventListener('click', () => changeMonthModal(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => changeMonthModal(1));
      if (todayBtn) todayBtn.addEventListener('click', () => jumpToCurrentMonthModal());

      // Attach click handlers for day cells with workouts
      container.querySelectorAll('.calendar-day-cell[data-workouts]').forEach(el => {
        el.addEventListener('click', () => {
          try {
            const encoded = el.getAttribute('data-workouts');
            const ws = encoded ? JSON.parse(decodeURIComponent(encoded)) : null;
            const date = el.getAttribute('data-date');
            if (ws) {
              if (typeof window.showWorkoutModal === 'function') {
                window.showWorkoutModal(date, ws);
              } else if (typeof window.showWorkoutModalPreview === 'function') {
                window.showWorkoutModalPreview(date, ws);
              }
            }
          } catch (e) { console.error('Failed to open workout modal', e); }
        });
      });
    }

    // expose function
    window.renderWizardCalendar = renderWizardCalendar;
})();
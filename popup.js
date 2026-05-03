document.addEventListener('DOMContentLoaded', () => {
  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');
  const generateBtn = document.getElementById('generateBtn');
  const clearLocksBtn = document.getElementById('clearLocksBtn');
  const exportBtn = document.getElementById('exportBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultsContainer = document.getElementById('resultsContainer');
  const scheduleTitle = document.getElementById('scheduleTitle');
  const scheduleBody = document.getElementById('scheduleBody');
  const statsContent = document.getElementById('statsContent');

  // Modal elements
  const editShiftModal = document.getElementById('editShiftModal');
  const editShiftTitle = document.getElementById('editShiftTitle');
  const editShiftDesc = document.getElementById('editShiftDesc');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const clearLockBtn = document.getElementById('clearLockBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const checkboxes = document.querySelectorAll('#personCheckboxes input[type="checkbox"]');

  const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const SHIFT_NAMES = { 'm': '早班', 'a': '午班', 'n': '晚班' };

  let lockedShifts = {};
  let currentScheduleData = null;
  let editingShift = null; // { date, shiftType, requiredCount }

  // 動態生成年份選項 (民國114年至135年)
  yearSelect.innerHTML = '';
  for (let y = 114; y <= 135; y++) {
    const option = document.createElement('option');
    option.value = y + 1911;
    option.textContent = `民國${y}年`;
    if (y === 115) option.selected = true; // 預設選中115年
    yearSelect.appendChild(option);
  }

  function renderSchedule(data, year, month) {
    currentScheduleData = data;
    scheduleBody.innerHTML = '';
    statsContent.innerHTML = '';

    const persons = ['A', 'B', 'C', 'D'];
    persons.forEach(p => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="stat-name p-${p}">${p}醫師</div>
        <div class="stat-details">
          <span>總班數: <strong>${data.stats.total[p]}</strong></span>
          <span>晚班數: <strong>${data.stats.night[p]}</strong></span>
        </div>
      `;
      statsContent.appendChild(card);
    });

    data.schedule.forEach(day => {
      const tr = document.createElement('tr');
      if (day.type === 'Sun') {
        tr.className = 'row-sun';
        tr.innerHTML = `
          <td>${month}/${day.date}</td>
          <td>星期${DAYS[day.dayOfWeek]}</td>
          <td colspan="3">休診</td>
        `;
      } else {
        const renderBadges = (arr) => {
          return arr.map(p => `<span class="person-badge p-${p}">${p}</span>`).join('');
        };

        const isLocked = (shiftType) => {
          return lockedShifts[day.date] && lockedShifts[day.date][shiftType];
        };

        const createCell = (shiftType, arr) => {
          let lockedClass = isLocked(shiftType) ? 'locked' : '';
          return `<div class="shift-cell ${lockedClass}" data-date="${day.date}" data-shift="${shiftType}" data-type="${day.type}">${renderBadges(arr)}</div>`;
        };

        tr.innerHTML = `
          <td>${month}/${day.date}</td>
          <td>星期${DAYS[day.dayOfWeek]}</td>
          <td>${createCell('m', day.config.m)}</td>
          <td>${createCell('a', day.config.a)}</td>
          <td>${createCell('n', day.config.n)}</td>
        `;
      }
      scheduleBody.appendChild(tr);
    });

    let twYear = year - 1911;
    scheduleTitle.textContent = `民國${twYear}年 ${month}月 班表`;

    resultsContainer.style.display = 'block';
    exportBtn.style.display = 'inline-flex';
    clearLocksBtn.style.display = Object.keys(lockedShifts).length > 0 ? 'inline-flex' : 'none';

    // 綁定點擊事件以編輯班次
    document.querySelectorAll('.shift-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        openEditModal(cell, month);
      });
    });
  }

  function openEditModal(cell, month) {
    const date = parseInt(cell.dataset.date);
    const shiftType = cell.dataset.shift;
    const dayType = cell.dataset.type;
    
    // 判斷該班次需要的人數
    let requiredCount = 2;
    if (dayType === 'TueFri' && shiftType === 'm') {
      requiredCount = 3;
    }

    editingShift = { date, shiftType, requiredCount };

    // 設定 Modal 文字
    editShiftTitle.textContent = `${month}/${date} ${SHIFT_NAMES[shiftType]}`;
    editShiftDesc.textContent = `請選擇 ${requiredCount} 名醫師：`;

    // 取得目前該班次的人員 (若有鎖定則用鎖定的，否則用當前班表的)
    let currentPersons = [];
    if (lockedShifts[date] && lockedShifts[date][shiftType]) {
      currentPersons = lockedShifts[date][shiftType];
    } else {
      const dayData = currentScheduleData.schedule.find(d => d.date === date);
      currentPersons = dayData.config[shiftType];
    }

    // 更新 Checkbox 狀態
    checkboxes.forEach(cb => {
      cb.checked = currentPersons.includes(cb.value);
    });

    // 如果該班次目前是鎖定狀態，才顯示解除鎖定按鈕
    clearLockBtn.style.display = (lockedShifts[date] && lockedShifts[date][shiftType]) ? 'inline-flex' : 'none';

    editShiftModal.showModal();
  }

  cancelEditBtn.addEventListener('click', () => {
    editShiftModal.close();
  });

  clearLockBtn.addEventListener('click', () => {
    if (editingShift && lockedShifts[editingShift.date]) {
      delete lockedShifts[editingShift.date][editingShift.shiftType];
      if (Object.keys(lockedShifts[editingShift.date]).length === 0) {
        delete lockedShifts[editingShift.date];
      }
      renderSchedule(currentScheduleData, parseInt(yearSelect.value), parseInt(monthSelect.value));
    }
    editShiftModal.close();
  });

  saveEditBtn.addEventListener('click', () => {
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    if (selected.length !== editingShift.requiredCount) {
      alert(`該班次規定必須選擇 ${editingShift.requiredCount} 名醫師，請重新勾選！`);
      return;
    }

    // 儲存鎖定狀態
    if (!lockedShifts[editingShift.date]) {
      lockedShifts[editingShift.date] = {};
    }
    lockedShifts[editingShift.date][editingShift.shiftType] = selected;

    // 直接更新目前的畫面資料並重新渲染（這樣不須重排就能看到畫面變化及鎖頭）
    const dayData = currentScheduleData.schedule.find(d => d.date === editingShift.date);
    dayData.config[editingShift.shiftType] = selected;

    renderSchedule(currentScheduleData, parseInt(yearSelect.value), parseInt(monthSelect.value));
    editShiftModal.close();
  });

  clearLocksBtn.addEventListener('click', () => {
    if (confirm('確定要清除所有已鎖定的班次嗎？')) {
      lockedShifts = {};
      renderSchedule(currentScheduleData, parseInt(yearSelect.value), parseInt(monthSelect.value));
    }
  });

  // 當切換年月時，重置鎖定與結果畫面
  const handleDateChange = () => {
    lockedShifts = {};
    resultsContainer.style.display = 'none';
    clearLocksBtn.style.display = 'none';
    currentScheduleData = null;
  };
  yearSelect.addEventListener('change', handleDateChange);
  monthSelect.addEventListener('change', handleDateChange);

  generateBtn.addEventListener('click', () => {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    generateBtn.disabled = true;
    resultsContainer.style.display = 'none';
    loadingIndicator.style.display = 'flex';

    setTimeout(() => {
      try {
        const data = window.Scheduler.generate(year, month, lockedShifts);
        renderSchedule(data, year, month);
      } catch (err) {
        alert(err.message);
        // 若發生錯誤，退回原本顯示的班表畫面
        if (currentScheduleData) {
          renderSchedule(currentScheduleData, year, month);
        }
      } finally {
        loadingIndicator.style.display = 'none';
        generateBtn.disabled = false;
      }
    }, 100);
  });

  exportBtn.addEventListener('click', () => {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    let twYear = year - 1911;
    
    // Copy the table to manipulate for Excel format
    const tableClone = document.getElementById('scheduleTable').cloneNode(true);
    
    // Convert styled spans to plain text for Excel
    const badges = tableClone.querySelectorAll('.person-badge');
    badges.forEach(badge => {
      const text = document.createTextNode(badge.textContent + ' ');
      badge.parentNode.replaceChild(text, badge);
    });

    const tableHTML = tableClone.outerHTML;
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>班表</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>{table}</body></html>';
    const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) };
    const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) };
    
    const ctx = { worksheet: '班表', table: tableHTML };
    
    const link = document.createElement('a');
    link.download = `排班表_民國${twYear}年${month}月.xls`;
    link.href = uri + base64(format(template, ctx));
    link.click();
  });
});

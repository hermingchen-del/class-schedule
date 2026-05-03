document.addEventListener('DOMContentLoaded', () => {
  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');
  const generateBtn = document.getElementById('generateBtn');
  const exportBtn = document.getElementById('exportBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultsContainer = document.getElementById('resultsContainer');
  const scheduleTitle = document.getElementById('scheduleTitle');
  const scheduleBody = document.getElementById('scheduleBody');
  const statsContent = document.getElementById('statsContent');

  const DAYS = ['日', '一', '二', '三', '四', '五', '六'];

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

        tr.innerHTML = `
          <td>${month}/${day.date}</td>
          <td>星期${DAYS[day.dayOfWeek]}</td>
          <td><div class="shift-cell">${renderBadges(day.config.m)}</div></td>
          <td><div class="shift-cell">${renderBadges(day.config.a)}</div></td>
          <td><div class="shift-cell">${renderBadges(day.config.n)}</div></td>
        `;
      }
      scheduleBody.appendChild(tr);
    });

    let twYear = year - 1911;
    scheduleTitle.textContent = `民國${twYear}年 ${month}月 班表`;

    resultsContainer.style.display = 'block';
    exportBtn.style.display = 'inline-flex';
  }

  generateBtn.addEventListener('click', () => {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    generateBtn.disabled = true;
    resultsContainer.style.display = 'none';
    loadingIndicator.style.display = 'flex';

    setTimeout(() => {
      const data = window.Scheduler.generate(year, month);
      renderSchedule(data, year, month);
      
      loadingIndicator.style.display = 'none';
      generateBtn.disabled = false;
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

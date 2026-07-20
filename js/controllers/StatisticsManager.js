class StatisticsManager {
  constructor(app) {
    this.app = app;
    this.refreshInterval = null;
    this.charts = {};
    this.init();
  }

  init() {
    this.render();
    // Auto refresh every 30 seconds
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      // Only refresh if the statistics view is active
      const statView = document.getElementById('view-statistics');
      if (statView && statView.classList.contains('active')) {
        this.render();
      }
    }, 30000);
  }

  async render() {
    try {
      const dbData = await window.api.analytics.getDashboardData();
      if (!dbData) return;

      this.updateOverviewCards(dbData.overview);
      this.updateTopGames(dbData.topGames);
      this.updateRecentActivity(dbData.recentActivity);
      this.updateBannerStats(dbData.bannerStats);
      this.updateTopCategories(dbData.topGames);
      
      this.renderCharts(dbData.charts);
    } catch (e) {
      console.error('Failed to load statistics', e);
    }
  }

  updateOverviewCards(overview) {
    const map = {
      'stat-total-users': overview.totalUsers,
      'stat-active-users': overview.activeUsersToday,
      'stat-app-opens': overview.appOpens,
      'stat-game-plays': overview.gamePlays,
      'stat-favorites': overview.favorites,
      'stat-avg-session': overview.avgSessionTime + 's',
      'stat-games-today': overview.gamesPlayedToday
    };

    for (const [id, value] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
  }

  updateTopGames(topGames) {
    const tbody = document.getElementById('stats-games-tbody');
    if (!tbody) return;

    if (!topGames || topGames.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد بيانات متاحة</td></tr>';
      return;
    }

    tbody.innerHTML = topGames.map(g => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${g.image || 'assets/placeholder.svg'}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" onerror="this.src='assets/placeholder.svg'">
            <span style="font-weight: 500;">${g.name}</span>
          </div>
        </td>
        <td><span class="badge" style="background: var(--primary-light); color: var(--primary);">${g.category || 'غير محدد'}</span></td>
        <td>${g.plays || 0}</td>
        <td>${g.uniquePlayers || 0}</td>
        <td>${g.avgTime || 0}s</td>
        <td>${g.lastPlayed ? new Date(g.lastPlayed).toLocaleString('ar-EG') : '-'}</td>
      </tr>
    `).join('');
  }

  updateRecentActivity(activities) {
    const ul = document.getElementById('stats-recent-activity');
    if (!ul) return;

    if (!activities || activities.length === 0) {
      ul.innerHTML = '<li style="text-align:center; padding: 12px; color: var(--text-muted);">لا يوجد نشاط حديث</li>';
      return;
    }

    const actionMap = {
      'app-open': { text: 'فتح التطبيق', icon: 'bx-mobile', color: 'var(--primary)' },
      'game-start': { text: 'تشغيل لعبة', icon: 'bx-play-circle', color: 'var(--success)' },
      'game-end': { text: 'إنهاء لعبة', icon: 'bx-stop-circle', color: 'var(--warning)' },
      'favorite': { text: 'إضافة للمفضلة', icon: 'bx-heart', color: 'var(--danger)' },
      'banner-click': { text: 'الضغط على البنر', icon: 'bx-pointer', color: 'var(--info)' }
    };

    ul.innerHTML = activities.map(a => {
      const meta = actionMap[a.action] || { text: a.action, icon: 'bx-info-circle', color: 'var(--text-muted)' };
      const timeStr = new Date(a.time).toLocaleTimeString('ar-EG');
      return `
        <li style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border-light); border-radius: 12px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${meta.color}22; color: ${meta.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class='bx ${meta.icon}'></i>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 500;">مستخدم ${meta.text} ${a.game ? `(${a.game})` : ''}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${timeStr}</div>
          </div>
        </li>
      `;
    }).join('');
  }

  updateBannerStats(banners) {
    const tbody = document.getElementById('stats-banners-tbody');
    if (!tbody) return;

    if (!banners || banners.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد بيانات متاحة</td></tr>';
      return;
    }

    tbody.innerHTML = banners.map(b => `
      <tr>
        <td style="font-weight: 500;">${b.title}</td>
        <td>${b.views}</td>
        <td>${b.clicks}</td>
        <td><span class="badge ${parseFloat(b.ctr) > 2 ? 'badge-success' : 'badge-secondary'}">${b.ctr}%</span></td>
        <td>${b.lastClick ? new Date(b.lastClick).toLocaleString('ar-EG') : '-'}</td>
      </tr>
    `).join('');
  }

  updateTopCategories(topGames) {
    const container = document.getElementById('stats-categories-progress');
    if (!container) return;

    // Aggregate from topGames for simplicity if category stats aren't directly provided
    const catCounts = {};
    let totalPlays = 0;
    (topGames || []).forEach(g => {
      const cat = g.category || 'أخرى';
      catCounts[cat] = (catCounts[cat] || 0) + (g.plays || 0);
      totalPlays += (g.plays || 0);
    });

    const sortedCats = Object.entries(catCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

    if (sortedCats.length === 0) {
      container.innerHTML = '<div style="text-align:center; color: var(--text-muted);">لا توجد بيانات متاحة</div>';
      return;
    }

    container.innerHTML = sortedCats.map(([name, plays]) => {
      const pct = totalPlays > 0 ? Math.round((plays / totalPlays) * 100) : 0;
      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; margin-bottom: 8px;">
            <span>${name}</span>
            <span>${plays} مرة (${pct}%)</span>
          </div>
          <div style="width: 100%; height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: var(--primary); border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCharts(chartsData) {
    if (!window.Chart) return;

    this.initChart('chart-daily-users', 'line', 'المستخدمين النشطين', chartsData.dailyUsers.map(d => d.x), chartsData.dailyUsers.map(d => d.y), '#3b82f6');
    this.initChart('chart-daily-plays', 'bar', 'مرات اللعب', chartsData.dailyPlays.map(d => d.x), chartsData.dailyPlays.map(d => d.y), '#10b981');
    
    if (chartsData.topGamesLabels && chartsData.topGamesLabels.length > 0) {
      this.initChart('chart-top-games', 'doughnut', 'أكثر الألعاب', chartsData.topGamesLabels, chartsData.topGamesData, ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1']);
    }
    if (chartsData.topCatsLabels && chartsData.topCatsLabels.length > 0) {
      this.initChart('chart-top-categories', 'pie', 'أكثر الأقسام', chartsData.topCatsLabels, chartsData.topCatsData, ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444']);
    }
  }

  initChart(canvasId, type, label, labels, data, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].data.labels = labels;
      this.charts[canvasId].data.datasets[0].data = data;
      this.charts[canvasId].update();
      return;
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: colors,
          borderColor: type === 'line' ? colors : 'transparent',
          tension: 0.4,
          fill: type === 'line'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type === 'doughnut' }
        }
      }
    });
  }
}
window.StatisticsManager = StatisticsManager;

export function toJST(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

export function fmtDate(d) {
  const j = toJST(new Date(d));
  return `${j.getUTCFullYear()}/${j.getUTCMonth() + 1}/${j.getUTCDate()}`;
}

export function fmtTime(d) {
  const j = toJST(new Date(d));
  return `${String(j.getUTCHours()).padStart(2, '0')}:${String(j.getUTCMinutes()).padStart(2, '0')}`;
}

export function jstRangeOfMonth(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - 9 * 3600 * 1000),
    end: new Date(Date.UTC(year, month, 1) - 9 * 3600 * 1000),
  };
}

export function jstRangeOfDay(year, month, day) {
  return {
    start: new Date(Date.UTC(year, month - 1, day) - 9 * 3600 * 1000),
    end: new Date(Date.UTC(year, month - 1, day + 1) - 9 * 3600 * 1000),
  };
}

export function calcStats(rows) {
  let shinkiCount = 0, shinkiSales = 0, jorenCount = 0, jorenSales = 0, otherCount = 0, otherSales = 0;
  rows.forEach(r => {
    if (r.type === '新規')      { shinkiCount += +r.cnt || 1; shinkiSales += +r.sales || +r.amount; }
    else if (r.type === '常連') { jorenCount  += +r.cnt || 1; jorenSales  += +r.sales || +r.amount; }
    else                        { otherCount  += +r.cnt || 1; otherSales  += +r.sales || +r.amount; }
  });
  return {
    shinkiCount, jorenCount, otherCount, shinkiSales, jorenSales, otherSales,
    totalCount: shinkiCount + jorenCount + otherCount,
    totalSales: shinkiSales + jorenSales + otherSales,
  };
}

export function unauthorized() {
  return Response.json({ success: false, message: '認証が必要です' }, { status: 401 });
}

export function serverError(e) {
  return Response.json({ success: false, message: e.message }, { status: 500 });
}

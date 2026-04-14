/** Vietnamese UI labels for health / risk enums and priority chips. */

export const HEALTH_VI = {
  Excellent: 'Tốt',
  Good: 'Bình thường',
  Fair: 'Trung bình',
  Poor: 'Yếu',
  Critical: 'Nguy kịch',
}

export const RISK_VI = {
  Low: 'Thấp',
  Moderate: 'Trung bình',
  High: 'Cao',
  Extreme: 'Rất cao',
}

export function healthVi(value) {
  return HEALTH_VI[value] ?? String(value ?? '')
}

export function riskVi(value) {
  return RISK_VI[value] ?? String(value ?? '')
}

export const PRIORITY_CHIP_VI = {
  fairWatch: 'Tán trung bình · theo dõi',
  extremeRisk: 'Nguy cơ rất cao',
  highRisk: 'Nguy cơ cao',
  powerLine: 'Đường dây điện',
  building: 'Công trình',
  flagged: 'Ưu tiên xử lý',
}

/** Chart legend: English inventory keys → Vietnamese */
export const HEALTH_CHART_LEGEND_VI = {
  Excellent: 'Tốt',
  Good: 'Bình thường',
  Fair: 'Trung bình',
  Poor: 'Yếu',
  Critical: 'Nguy kịch',
}

/**
 * Port dari checkResultStatus() di FE_SiLAKES
 * (src/components/users/sid/public/HasilDigital.vue), SAMA PERSIS logikanya
 * (aturan rentang usia "th:", aturan gender "L:"/"P:", multi-aturan dipisah
 * "|", operator <, <=, >, >=, rentang "a-b") supaya definisi "abnormal" di
 * SiLACARE konsisten dengan yang staf lihat di SiLAKES. Hanya boolean
 * abnormal yang dipakai di sini (tanpa label/deskripsi kondisi), SiLACARE
 * cukup menandai merah, tidak menjelaskan alasannya.
 */
export interface ResultStatusPatient {
  age: number | null
  gender: 'L' | 'P' | string | null
}

function evaluateCondition(resultRange: number[], condition: string): boolean {
  condition = condition.trim()

  if (condition.includes('-')) {
    const numbers = (condition.match(/\d+(\.\d+)?/g) || []).map(Number)
    return validateRange(resultRange, numbers)
  } else if (condition.includes('<=')) {
    return resultRange.every((val) => val <= parseFloat(condition.replace('<=', '')))
  } else if (condition.includes('>=')) {
    return resultRange.every((val) => val >= parseFloat(condition.replace('>=', '')))
  } else if (condition.includes('<')) {
    return resultRange.every((val) => val < parseFloat(condition.replace('<', '')))
  } else if (condition.includes('>')) {
    return resultRange.every((val) => val > parseFloat(condition.replace('>', '')))
  }

  return false
}

function validateRange(resultRange: number[], referenceRange: number[]): boolean {
  if (referenceRange.length < 2) return false
  if (resultRange.length === 1) {
    return resultRange[0] >= referenceRange[0] && resultRange[0] <= referenceRange[1]
  } else if (resultRange.length === 2) {
    return resultRange[0] >= referenceRange[0] && resultRange[1] <= referenceRange[1]
  }
  return false
}

export function isAbnormalResult(hasil: string | null, nilaiRujukan: string | null, patient: ResultStatusPatient): boolean {
  if (!hasil || !nilaiRujukan) return false

  if (['normal', 'jernih', 'kuning', 'kuning kecoklatan'].includes(hasil.toLowerCase())) {
    return false
  }

  if (['negatif', 'positif'].includes(hasil.toLowerCase())) {
    return hasil.toLowerCase() !== nilaiRujukan.toLowerCase()
  }

  const resultRange = hasil.split('-').map((val) => parseFloat(val.trim()))
  if (resultRange.some((v) => Number.isNaN(v))) return false

  const rules = nilaiRujukan.split('|').map((rule) => rule.trim())
  let matched = false

  for (const rule of rules) {
    if (rule.includes('th:')) {
      const parts = rule.split(':')
      const ageRangePart = parts[0].match(/(<=?|>=?)?\d+(-\d+)?/g)
      const rangeValues = parts[1].split('-').map((val) => parseFloat(val))

      if (ageRangePart && patient.age !== null) {
        const [minAge, maxAge] = ageRangePart[0].split('-').map(Number)
        const ageCondition = ageRangePart[0].match(/(<=?|>=?)/)?.[0] || ''

        let ageValid = false
        if (ageCondition.includes('<=')) ageValid = patient.age <= maxAge
        else if (ageCondition.includes('>=')) ageValid = patient.age >= minAge
        else if (ageCondition.includes('-')) ageValid = patient.age >= minAge && patient.age <= maxAge

        if (ageValid) {
          if (validateRange(resultRange, rangeValues)) return false
          matched = true
        }
      }
    } else if (rule.includes('L:') || rule.includes('P:')) {
      const genderRule = rule.split(':')
      const gender = genderRule[0].trim()
      const condition = genderRule[1]?.trim() || ''

      if (patient.gender === gender) {
        if (evaluateCondition(resultRange, condition)) return false
        matched = true
      }
    } else {
      if (evaluateCondition(resultRange, rule)) return false
      matched = true
    }
  }

  return matched
}

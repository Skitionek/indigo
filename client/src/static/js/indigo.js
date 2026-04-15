import { saveAs } from 'file-saver'
import { TraceViewElement, AlignmentViewElement, DecompositionViewElement, VariantsTableElement, ungapped } from './elements'

const API_URL = process.env.API_URL

$('#mainTab a').on('click', function(e) {
  e.preventDefault()
  $(this).tab('show')
})

$('[data-toggle="tooltip"]').tooltip()

const resultLink = document.getElementById('link-results')

const submitButton = document.getElementById('btn-submit')
submitButton.addEventListener('click', function() {
  resultLink.click()
  run()
})

const exampleButton = document.getElementById('btn-example')
exampleButton.addEventListener('click', showExample)

const inputFile = document.getElementById('inputFile')
const leftTrim = document.querySelector('#leftTrim')
const rightTrim = document.querySelector('#rightTrim')
const peakRatio = document.querySelector('#peakRatio')
const targetFastaFile = document.getElementById('targetFileFasta')
const targetChromatogramFile = document.getElementById('targetFileChromatogram')
const targetGenomes = document.getElementById('target-genome')
const targetTabs = document.getElementById('target-tabs')
const linkPdf = document.getElementById('link-pdf')
const decompositionChart = document.getElementById('decomposition-chart')
const alignmentChart1 = document.getElementById('alignment-chart-1')
const alignmentChart2 = document.getElementById('alignment-chart-2')
const alignmentChart3 = document.getElementById('alignment-chart-3')
const traceChart = document.getElementById('trace-chart')
const variantsTable = document.getElementById('variants-table')
const resultContainer = document.getElementById('result-container')
const resultInfo = document.getElementById('result-info')
const resultError = document.getElementById('result-error')
let downloadUrl

function updatePeakRatioValue() {
  document.getElementById('peakRatioValue').innerText = peakRatio.value
}

updatePeakRatioValue()
window.updatePeakRatioValue = updatePeakRatioValue

// TODO client-side validation
function run() {
  const lTrim = Number.parseInt(leftTrim.value, 10)
  const rTrim = Number.parseInt(rightTrim.value, 10)
  const pRatio = Number.parseInt(peakRatio.value, 10)

  const formData = new FormData()
  formData.append('queryFile', inputFile.files[0])
  formData.append('leftTrim', lTrim)
  formData.append('rightTrim', rTrim)
  formData.append('peakRatio', pRatio)
  const target = targetTabs.querySelector('a.active').id

  if (target.startsWith('target-genome')) {
    const genome = targetGenomes.querySelector('option:checked').value
    formData.append('genome', genome)
  } else if (target.startsWith('target-fasta')) {
    formData.append('fastaFile', targetFastaFile.files[0])
  } else if (target.startsWith('target-chromatogram')) {
    formData.append('chromatogramFile', targetChromatogramFile.files[0])
  }

  hideElement(resultContainer)
  hideElement(resultError)
  showElement(resultInfo)

  axios
    .post(`${API_URL}/upload`, formData)
    .then(res => {
      if (res.status === 200) {
        handleSuccess(res.data.data)
      }
    })
    .catch(err => {
      let errorMessage = err
      if (err.response) {
        errorMessage = err.response.data.errors
          .map(error => error.title)
          .join('; ')
      }
      hideElement(resultInfo)
      showElement(resultError)
      resultError.querySelector('#error-message').textContent = errorMessage
    })
}

function handleSuccess(data) {
  hideElement(resultInfo)
  hideElement(resultError)
  showElement(resultContainer)

  // needed in downloadBcf() as well
  downloadUrl = data.url
  linkPdf.href = `${API_URL}/${downloadUrl}/pdf`

  traceChart.displayData(data)

  decompositionChart.displayData(data)

  const alignmentCharactersPerLine = 80

  const alt1 = {
    sequence: ungapped(data.alt1align),
    alignmentString: data.alt1align,
    isReverseComplement: false,
    chromosome: 'Alt1',
    startPosition: 1,
    label: 'Alt1',
    alleleFraction: data.allele1fraction
  }

  const ref1 = {
    sequence: ungapped(data.ref1align),
    alignmentString: data.ref1align,
    isReverseComplement: data.ref1forward === 0,
    chromosome: data.ref1chr,
    startPosition: data.ref1pos,
    label: 'Ref'
  }

  alignmentChart1.displayData({
    alt: alt1,
    ref: ref1,
    charactersPerLine: alignmentCharactersPerLine,
    score: data.align1score ? data.align1score : undefined
  })
  
  const alt2 = {
    sequence: ungapped(data.alt2align),
    alignmentString: data.alt2align,
    isReverseComplement: false,
    chromosome: 'Alt2',
    startPosition: 1,
    label: 'Alt2',
    alleleFraction: data.allele2fraction
  }

  const ref2 = {
    sequence: ungapped(data.ref2align),
    alignmentString: data.ref2align,
    isReverseComplement: data.ref2forward === 0,
    chromosome: data.ref2chr,
    startPosition: data.ref2pos,
    label: 'Ref'
  }

  alignmentChart2.displayData({
    alt: alt2,
    ref: ref2,
    charactersPerLine: alignmentCharactersPerLine,
    score: data.align2score ? data.align2score : undefined
  })

  const alt3 = {
    ...alt1,
    alignmentString: data.allele1align,
  }

  const ref3 = {
    ...alt2,
    alignmentString: data.allele2align,
  }
  
  alignmentChart3.displayData({
    alt: alt3,
    ref: ref3,
    charactersPerLine: alignmentCharactersPerLine,
    score: data.align3score ? data.align3score : undefined
  })

  variantsTable.displayData(data, traceChart)
}

window.customElements.define('trace-view', TraceViewElement)
window.customElements.define('alignment-view', AlignmentViewElement)
window.customElements.define('decomposition-view', DecompositionViewElement)
window.customElements.define('variants-view', VariantsTableElement)

function showExample() {
  resultLink.click()
  const formData = new FormData()
  formData.append('showExample', 'showExample')
  hideElement(resultContainer)
  hideElement(resultError)
  showElement(resultInfo)
  axios
    .post(`${API_URL}/upload`, formData)
    .then(res => {
      if (res.status === 200) {
        handleSuccess(res.data.data)
      }
    })
    .catch(err => {
      let errorMessage = err
      if (err.response) {
        errorMessage = err.response.data.errors
          .map(error => error.title)
          .join('; ')
      }
      hideElement(resultInfo)
      showElement(resultError)
      resultError.querySelector('#error-message').textContent = errorMessage
    })
}

window.downloadBcf = downloadBcf
function downloadBcf() {
  // TODO: better bcf file name
  saveAs(`${API_URL}/${downloadUrl}/bcf`, 'indigo-variants.bcf')
}

window.handleTocChange = handleTocChange
function handleTocChange(select) {
  const targetId = select.value
  if (targetId !== '#') {
    document.getElementById(targetId).scrollIntoView()
    select.value = '#'
  }
}

function showElement(element) {
  element.classList.remove('d-none')
}

function hideElement(element) {
  element.classList.add('d-none')
}

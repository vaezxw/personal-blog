<template>
  <div class="tool-pane">
    <div class="tool-toolbar">
      <label class="tool-control tool-control--wide">
        <span>{{ t('tools.doc.direction') }}</span>
        <select class="tool-select" v-model="direction">
          <option value="docx-pdf">{{ t('tools.doc.docxToPdf') }}</option>
          <option value="pdf-docx">{{ t('tools.doc.pdfToDocx') }}</option>
        </select>
      </label>
      <div class="tool-actions">
        <label class="file-btn btn ghost">
          <input type="file" :accept="acceptTypes" @change="onFile" />
          {{ t('tools.common.upload') }}
        </label>
        <button class="btn" type="button" :disabled="!file || busy" @click="convert">
          {{ busy ? t('tools.doc.converting') : t('tools.doc.convert') }}
        </button>
        <button class="btn ghost" type="button" :disabled="!resultBlob" @click="downloadResult">
          {{ t('tools.common.download') }}
        </button>
      </div>
    </div>

    <p v-if="fileName" class="muted">{{ t('tools.doc.selected', { name: fileName }) }}</p>
    <p class="muted tool-note">{{ t('tools.doc.note') }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { docxToPdf, guessDocKind, pdfToDocx } from '../../utils/docConvert.js'
import { downloadBlob } from '../../utils/download.js'

const { t } = useLocale()
const direction = ref('docx-pdf')
const file = ref(null)
const fileName = ref('')
const resultBlob = ref(null)
const resultName = ref('')
const busy = ref(false)
const error = ref('')
const info = ref('')

const acceptTypes = computed(() =>
  direction.value === 'docx-pdf'
    ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : '.pdf,application/pdf',
)

function onFile(event) {
  const picked = event.target.files?.[0]
  event.target.value = ''
  error.value = ''
  info.value = ''
  resultBlob.value = null
  if (!picked) return
  const kind = guessDocKind(picked)
  const expected = direction.value === 'docx-pdf' ? 'docx' : 'pdf'
  if (kind !== expected) {
    error.value = t('tools.doc.wrongType')
    file.value = null
    fileName.value = ''
    return
  }
  file.value = picked
  fileName.value = picked.name
}

async function convert() {
  if (!file.value) return
  busy.value = true
  error.value = ''
  info.value = ''
  resultBlob.value = null
  try {
    const buffer = await file.value.arrayBuffer()
    if (direction.value === 'docx-pdf') {
      resultBlob.value = await docxToPdf(buffer)
      resultName.value = fileName.value.replace(/\.docx$/i, '') + '.pdf'
      info.value = t('tools.doc.okPdf')
    } else {
      resultBlob.value = await pdfToDocx(buffer)
      resultName.value = fileName.value.replace(/\.pdf$/i, '') + '.docx'
      info.value = t('tools.doc.okDocx')
    }
  } catch (err) {
    error.value = err.message || t('tools.doc.failed')
  } finally {
    busy.value = false
  }
}

function downloadResult() {
  if (!resultBlob.value) return
  downloadBlob(resultBlob.value, resultName.value || 'converted.bin')
}
</script>

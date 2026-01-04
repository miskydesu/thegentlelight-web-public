type SwalModule = typeof import('sweetalert2')

async function getSwal() {
  const mod: SwalModule = await import('sweetalert2')
  return mod.default
}

export async function swalError(message: string, title = 'エラー（Error）') {
  const Swal = await getSwal()
  await Swal.fire({
    icon: 'error',
    title,
    text: message || 'エラーが発生しました',
    confirmButtonText: 'OK',
  })
}

export async function swalInfo(message: string, title = 'お知らせ（Info）') {
  const Swal = await getSwal()
  await Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonText: 'OK',
  })
}

export async function swalSuccess(message: string, title = '完了（Done）') {
  const Swal = await getSwal()
  await Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonText: 'OK',
  })
}

export async function swalConfirm(opts: { title: string; text: string; confirmText?: string; cancelText?: string }) {
  const Swal = await getSwal()
  const res = await Swal.fire({
    icon: 'warning',
    title: opts.title,
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText || '実行（OK）',
    cancelButtonText: opts.cancelText || 'キャンセル',
    reverseButtons: true,
    focusCancel: true,
  })
  return !!res.isConfirmed
}

export async function swalLoading(title = '処理中…', text = 'しばらくお待ちください') {
  const Swal = await getSwal()
  Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

export async function swalClose() {
  const Swal = await getSwal()
  Swal.close()
}



import Swal from 'sweetalert2'

export async function swalError(message: string, title = 'エラー（Error）') {
  await Swal.fire({
    icon: 'error',
    title,
    text: message || 'エラーが発生しました',
    confirmButtonText: 'OK',
  })
}

export async function swalInfo(message: string, title = 'お知らせ（Info）') {
  await Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonText: 'OK',
  })
}

export async function swalSuccess(message: string, title = '完了（Done）') {
  await Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonText: 'OK',
  })
}

export async function swalConfirm(opts: { title: string; text: string; confirmText?: string; cancelText?: string }) {
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
  Swal.close()
}



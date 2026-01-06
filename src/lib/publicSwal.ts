let swalPromise: Promise<any> | null = null

async function getSwal() {
  // sweetalert2 はSSRと相性が悪いので、クライアント実行時にのみ動的importする
  if (typeof window === 'undefined') return null
  if (!swalPromise) swalPromise = import('sweetalert2').then((m) => m.default)
  return swalPromise
}

export async function openProgressDialog(title: string, text?: string) {
  const Swal = await getSwal()
  if (!Swal) return
  Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

export async function closeProgressDialog() {
  const Swal = await getSwal()
  if (!Swal) return
  Swal.close()
}



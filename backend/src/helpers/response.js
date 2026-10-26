export function responder(res, { data, error }) {
  if (error) {
    return res.status(400).json({ data: null, error: { message: error.message } })
  }
  return res.status(200).json({ data, error: null })
}
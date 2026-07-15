import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import { useBankData } from '../hooks/useBankData'

export default function BankCallbackPage() {
  const [searchParams] = useSearchParams()
  const { completeConnection } = useBankData()
  const [status, setStatus] = useState('working')
  const [message, setMessage] = useState('Finishing up your bank connection…')
  const navigate = useNavigate()

  useEffect(() => {
    const reference = searchParams.get('ref')
    if (!reference) {
      setStatus('error')
      setMessage('No reference found in the redirect URL.')
      return
    }

    completeConnection(reference)
      .then(() => {
        setStatus('success')
        setMessage('Bank connected! Redirecting…')
        setTimeout(() => navigate('/bank'), 1200)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Card title="Connecting your bank">
        <p className={status === 'error' ? 'text-red-300' : 'text-zinc-300'}>{message}</p>
      </Card>
    </div>
  )
}

import type { NextPage } from 'next'
import WalletLoader from 'components/WalletLoader'
import { useSigningClient } from 'contexts/cosmwasm'
import { useEffect, useState, MouseEvent, ChangeEvent } from 'react'
import {
  convertMicroDenomToDenom, 
  convertDenomToMicroDenom,
  convertFromMicroDenom
} from 'util/conversion'
import { coin } from '@cosmjs/launchpad'
import { useAlert } from 'react-alert'
import {voters} from 'proposal.json'

const PUBLIC_STAKING_DENOM = process.env.NEXT_PUBLIC_STAKING_DENOM || 'ujuno'
const PUBLIC_AIRDROP_CONTRACT = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || ''
const PUBLIC_CW20_CONTRACT = process.env.NEXT_PUBLIC_CW20_CONTRACT || ''

const Home: NextPage = () => {
  const { walletAddress, signingClient, connectWallet, getMerkleProof } = useSigningClient()
  const [balance, setBalance] = useState('')
  const [cw20Balance, setCw20Balance] = useState('')
  const [walletAmount, setWalletAmount] = useState(0)
  const [loadedAt, setLoadedAt] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState({ name: '', symbol: '' })
  const [numToken, setNumToken] = useState(0)
  const [price, setPrice] = useState(0)
  const [showNumToken, setShowNumToken] = useState(false)
  const [merkleProof, setMerkleProof] = useState([])


  const [airdropAmount, setAirdropAmount] = useState(0)
  const [isClaimed, setIsClaimed] = useState(false)
  const alert = useAlert()

  useEffect(() => {
    if (!signingClient || walletAddress.length === 0) return

   
    // console.log(voters)
    voters.forEach((rec) => {
      // console.log(rec.address + " : " + walletAddress)
      if (rec.address == walletAddress) {
        // console.log("this wallet amount : " + rec.amount)
        setAirdropAmount(parseInt(rec.amount))
      }
    });

    // Gets native balance (i.e. Juno balance)
    signingClient.getBalance(walletAddress, PUBLIC_STAKING_DENOM).then((response: any) => {
      const { amount, denom }: { amount: number; denom: string } = response
      setBalance(`${convertMicroDenomToDenom(amount)} ${convertFromMicroDenom(denom)}`)
      setWalletAmount(convertMicroDenomToDenom(amount))
    }).catch((error) => {
      alert.error(`Error! ${error.message}`)
      console.log('Error signingClient.getBalance(): ', error)
    })

    // Gets cw20 balance
    signingClient.queryContractSmart(PUBLIC_CW20_CONTRACT, {
      balance: { address: walletAddress },
    }).then((response) => {
      setCw20Balance(response.balance)
    }).catch((error) => {
      alert.error(`Error! ${error.message}`)
      console.log('Error signingClient.queryContractSmart() balance: ', error)
    })
  }, [signingClient, walletAddress, loadedAt, alert])

  useEffect(() => {
    if (!signingClient) return

    // Gets token information
    signingClient.queryContractSmart(PUBLIC_CW20_CONTRACT, {
      token_info: {},
    }).then((response) => {
      setTokenInfo(response)
      
    }).catch((error) => {
      alert.error(`Error! ${error.message}`)
      console.log('Error signingClient.queryContractSmart() token_info: ', error)
    })

    
  }, [signingClient, alert])

  useEffect(() => {
    if (!signingClient || walletAddress.length === 0) return

    
    getMerkleProof(airdropAmount).then((response:[]) => {
      // console.log("proof string")
      // console.log(response)
      setMerkleProof(response)
    }).catch((error:any) => {
      console.log(error)
      alert.error('Failed to get proof')
    })

    signingClient.queryContractSmart(PUBLIC_AIRDROP_CONTRACT, {
      is_claimed: {
        stage: 1,
        address: walletAddress
      },
    }).then((response) => {
      setIsClaimed(response.is_claimed)
      console.log(response.is_claimed)
      
    }).catch((error) => {
      alert.error(`Error! ${error.message}`)
      console.log('Error signingClient.queryContractSmart() is_claimed: ', error)
    })

    


  }, [signingClient, walletAddress, airdropAmount])


  /**
   * Calculates and sets the number of tokens given the purchase amount divided by the price
   */
  //  useEffect(() => {
  //   if (!signingClient) return

  //   signingClient.queryContractSmart(PUBLIC_AIRDROP_CONTRACT, {
  //     get_info: {},
  //   }).then((response) => {
  //     const price  = convertMicroDenomToDenom(response.price.amount)
  //     console.log("price : " + price) // i.e. 1 POOD token = 1000 uJUNO (micro)
  //     setPrice(price)
  //     setNumToken(purchaseAmount/price)
  //   }).catch((error) => {
  //     alert.error(`Error! ${error.message}`)
  //     console.log('Error signingClient.queryContractSmart() get_info: ', error)
  //   })

  //   setShowNumToken(!!purchaseAmount)
  // }, [purchaseAmount, signingClient, alert])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { target: { value } } = event
  }

  const handleAirdrop = (event: MouseEvent<HTMLElement>) => {
    if (!signingClient || walletAddress.length === 0) return
    
    if (isClaimed) {
      alert.success('Already airdropped!')
      return
    }
    event.preventDefault()
    setLoading(true)
    const defaultFee = {
      amount: [],
      gas: "400000",
    };

    signingClient?.execute(
      walletAddress, // sender address
      PUBLIC_AIRDROP_CONTRACT, // token sale contract
      { "claim": {
        "stage": 1,
        "amount": `${airdropAmount}`,
        "proof": merkleProof
      } }, // msg
      defaultFee,
      undefined,
      []
    ).then((response) => {
      setLoadedAt(new Date())
      setLoading(false)
      alert.success('Successfully airdropped!')
    }).catch((error) => {
      setLoading(false)
      alert.error(`Error! ${error}`)
      console.log('Error signingClient?.execute(): ', error)
    })
  }

  return (
    <WalletLoader loading={loading}>
      {balance && (
        <p className="text-primary">
          <span>{`Your wallet has ${balance} `}</span>
        </p>
      )}

      {cw20Balance && (
        <p className="mt-2 text-primary">
          <span>{`and ${cw20Balance} ${tokenInfo.symbol} `}</span>
        </p>
      )}

      <h1 className="mt-10 text-5xl font-bold">
        Your airdrop amount
        <span>{` ${airdropAmount} `}</span>
      </h1>

      <div className="form-control">
        <div className="relative">
          
          {/* <button
            className="absolute rounded-l-none btn btn-lg btn-primary"
            onClick={handleAirdrop}
          >
            Get Airdrop
          </button> */}

          <button
            className="block btn btn-outline btn-primary w-full max-w-full truncate"
            onClick={handleAirdrop}
          >
            Get AirDrop
          </button>
        </div>
      </div>

      {showNumToken && (
        <div className="mt-8">
          You are getting
          <h1 className="text-3xl mt-3 text-primary">
            <span>{`${numToken} ${tokenInfo.symbol} `}</span>
          </h1>
        </div>
      )}
    </WalletLoader>
  )
}

export default Home

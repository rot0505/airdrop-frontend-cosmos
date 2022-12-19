import { useState } from 'react'
import { connectKeplr } from 'services/keplr'
import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import {Command, flags} from '@oclif/command'
import {Airdrop} from '../util/merkle-airdrop-cli/airdrop'
import {voters} from 'proposal.json'

export interface ISigningCosmWasmClientContext {
  walletAddress: string
  client: CosmWasmClient | null
  signingClient: SigningCosmWasmClient | null
  loading: boolean
  error: any
  connectWallet: any
  disconnect: Function,
  getMerkleProof: Function  
}

const PUBLIC_RPC_ENDPOINT = process.env.NEXT_PUBLIC_CHAIN_RPC_ENDPOINT || ''
const PUBLIC_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID

export const useSigningCosmWasmClient = (): ISigningCosmWasmClientContext => {
  const [client, setClient] = useState<CosmWasmClient | null>(null)
  const [signingClient, setSigningClient] =
    useState<SigningCosmWasmClient | null>(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const connectWallet = async () => {
    setLoading(true)

    try {
      await connectKeplr()

      // enable website to access kepler
      await (window as any).keplr.enable(PUBLIC_CHAIN_ID)

      // get offline signer for signing txs
      const offlineSigner = await (window as any).getOfflineSigner(
        PUBLIC_CHAIN_ID
      )

      // make client
      setClient(
        await CosmWasmClient.connect(PUBLIC_RPC_ENDPOINT)
      )

      // make client
      setSigningClient(
        await SigningCosmWasmClient.connectWithSigner(
          PUBLIC_RPC_ENDPOINT,
          offlineSigner
        )
      )

      // get user address
      const [{ address }] = await offlineSigner.getAccounts()
      setWalletAddress(address)

      setLoading(false)
    } catch (error:any) {
      setError(error)
    }
  }

  const disconnect = () => {
    if (signingClient) {
      signingClient.disconnect()
    }
    setWalletAddress('')
    setSigningClient(null)
    setLoading(false)
  }

  const getMerkleProof = async (val:number) => {
    let ret:Array<Object> = []
    setLoading(true)
    if (walletAddress == '') {
      setLoading(false)
      return ret
    }
    
    // let file;
    // try {
    //   file = readFileSync(PROPOSAL_FILE, "utf8")
    // } catch (e) {
    //   setLoading(false)
    //   console.log(e.toString())
    //   setError(e)
    //   return ret
    // }

    // let receivers: Array<{ address: string; amount: string }> = JSON.parse(file);
    // console.log(voters)
    let receivers: Array<{ address: string; amount: string }> = voters
    let airdrop = new Airdrop(receivers)
    let proof = airdrop.getMerkleProof({address: walletAddress, amount: val.toString()})
    setLoading(false)
    return proof
    
  }

  return {
    walletAddress,
    signingClient,
    loading,
    error,
    connectWallet,
    disconnect,
    getMerkleProof,
    client
  }
}

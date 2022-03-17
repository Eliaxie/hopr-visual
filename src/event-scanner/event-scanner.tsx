import { ethers } from "ethers";
import {Buffer} from 'buffer';
import { publicKeyConvert, publicKeyCreate, ecdsaSign, ecdsaVerify, ecdsaRecover } from 'secp256k1'
import { keys as libp2p_crypto } from 'libp2p-crypto'
import * as PeerId from 'peer-id'
import { encode } from 'multihashes'
import { Multiaddr } from 'multiaddr'

export const ADDRESS_LENGTH = 20
const ALPHABET = '0123456789abcdef'
const provider = new ethers.providers.JsonRpcProvider("https://rpc.xdaichain.com");
const targetAddress = "0xD2F008718EEdD7aF7E9a466F5D68bb77D03B8F7A";
export const targetABIChannelUpdated = [
    "event ChannelUpdated(address indexed source, address indexed destination, (uint256,bytes32,uint256,uint256,uint8,uint256,uint32) newState)"
]

export const targetABIAnnouncement = [
    "event Announcement(address indexed account, bytes publicKey, bytes multiaddr)"
]

function getContract(address: string, abi :string[], provider: ethers.providers.BaseProvider) : ethers.Contract {
    return new ethers.Contract(address, abi, provider);
}

export default async function eventScanner(): Promise<ethers.Event[]> {

    let fromBlock = 20307201;
    let contract = getContract(targetAddress, targetABIChannelUpdated, provider);
    let filter = contract.filters.ChannelUpdated();

    let toReturn = await contract.queryFilter(filter, fromBlock)
    /*.then((events) => {
        console.log(events + "\n" + events.length)
    });*/
    return toReturn
}


export async function hoprAddressFinder(ethAddress: string): Promise<string>{
    try{
        let fromBlock = 20307201;
        let contract = getContract(targetAddress, targetABIAnnouncement, provider);
        let filter = contract.filters.Announcement(ethAddress);
        if(filter === undefined || filter.topics === undefined || filter.topics[1] === undefined || filter.address === undefined){
            return ethAddress
        }
        let str = filter.topics[1].toString();
        
        //console.log(pubKeyToPeerId("0x00000000000000000000000082c04af0643dacaea09a60baaa6cbc9e8e39c4bb").toB58String())
  
        console.log(PublicKey.createMock().toB58String())
        //console.log(filter);
        
        console.log();
        console.log("\n")
        //console.log(u8aToHex(stringToU8a(str), false));

        var arr = new Uint8Array(str.length);
        for(var i=str.length; i--; ){
            arr[i] = str.charCodeAt(i);
        }  
        let r = Buffer.from(arr).toString("base64")
        return r
    } catch (err){
        console.error(err)
        return "not found"
    }
}

export function stringToU8a(str: string, length?: number): Uint8Array {
    if (length != null && length <= 0) {
      return new Uint8Array([])
    }
  
    if (str.startsWith('0x')) {
      str = str.slice(2)
    }
  
    let strLength = str.length
  
    if ((strLength & 1) == 1) {
      str = '0' + str
      strLength++
    }
  
    if (length != null && strLength >> 1 > length) {
      throw Error('Input argument has too many hex decimals.')
    }
  
    if (length != null && strLength >> 1 < length) {
      str = str.padStart(length << 1, '0')
      strLength = length << 1
    }
  
    const arr = new Uint8Array(strLength >> 1)
  
    for (let i = 0; i < strLength; i += 2) {
      const strSlice = str.slice(i, i + 2).match(/[0-9a-fA-F]{2}/g)
  
      if (strSlice == null || strSlice.length != 1) {
        throw Error(`Got unknown character '${str.slice(i, i + 2)}'`)
      }
  
      arr[i >> 1] = parseInt(strSlice[0], 16)
    }
  
    return arr
  }
export function u8aToHex(arr?: Uint8Array, prefixed: boolean = true): string {
let result = prefixed ? '0x' : ''

if (arr == undefined || arr.length == 0) {
    return result
}
const arrLength = arr.length

for (let i = 0; i < arrLength; i++) {
    result += ALPHABET[arr[i] >> 4]
    result += ALPHABET[arr[i] & 15]
}

return result
}

class Address {
constructor(private arr: Uint8Array) {
    if (arr.length !== Address.SIZE) {
    throw new Error('Incorrect size Uint8Array for address')
    } else if (!ethers.utils.isAddress(u8aToHex(arr))) {
    throw new Error('Incorrect Uint8Array for address')
    }
}

static get SIZE(): number {
    return ADDRESS_LENGTH
}

static fromString(str: string): Address {
    return new Address(stringToU8a(str))
}

static deserialize(arr: Uint8Array) {
    return new Address(arr)
}

serialize() {
    return this.arr
}

toHex(): string {
    return ethers.utils.getAddress(u8aToHex(this.arr, false))
}

toString(): string {
    return this.toHex()
}


compare(b: Address): number {
    return Buffer.compare(this.serialize(), b.serialize())
}

lt(b: Address): boolean {
    return this.compare(b) < 0
}

sortPair(b: Address): [Address, Address] {
    return this.lt(b) ? [this, b] : [b, this]
}

static createMock(): Address {
    return Address.fromString('0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9')
}
}
  
class PublicKey {
// @TODO use uncompressed public key internally
constructor(private arr: Uint8Array) {
    if (arr.length !== PublicKey.SIZE) {
    throw new Error('Incorrect size Uint8Array for compressed public key')
    }
}

static fromPrivKey(privKey: Uint8Array): PublicKey {
    if (privKey.length !== 32) {
    throw new Error('Incorrect size Uint8Array for private key')
    }

    return new PublicKey(publicKeyCreate(privKey, true))
}

static fromUncompressedPubKey(arr: Uint8Array): PublicKey {
    if (arr.length !== 65) {
    throw new Error('Incorrect size Uint8Array for uncompressed public key')
    }

    return new PublicKey(publicKeyConvert(arr, true))
}

static fromPeerId(peerId: PeerId): PublicKey {
    return new PublicKey(peerId.pubKey.marshal())
}

static fromPeerIdString(peerIdString: string) {
    return PublicKey.fromPeerId(PeerId.createFromB58String(peerIdString))
}


toUncompressedPubKeyHex(): string {
    // Needed in only a few cases for interacting with secp256k1
    return u8aToHex(publicKeyConvert(this.arr, false).slice(1))
}

toPeerId(): PeerId {
    return pubKeyToPeerId(this.serialize())
}

static fromString(str: string): PublicKey {
    if (!str) {
    throw new Error('Cannot make address from empty string')
    }
    return new PublicKey(stringToU8a(str))
}

static get SIZE(): number {
    return 33
}

serialize() {
    return this.arr
}

toHex(): string {
    return u8aToHex(this.arr)
}

toString(): string {
    return `<PubKey:${this.toB58String()}>`
}

toB58String(): string {
    return this.toPeerId().toB58String()
}


static deserialize(arr: Uint8Array) {
    return new PublicKey(arr)
}

static createMock(): PublicKey {
    return PublicKey.fromString('0x021464586aeaea0eb5736884ca1bf42d165fc8e2243b1d917130fb9e321d7a93b8')
}
}
const COMPRESSED_PUBLIC_KEY_LENGTH = 33

export function pubKeyToPeerId(pubKey: Uint8Array | string): PeerId {
if (typeof pubKey === 'string') {
    pubKey = stringToU8a(pubKey, COMPRESSED_PUBLIC_KEY_LENGTH)
}

if (pubKey.length != COMPRESSED_PUBLIC_KEY_LENGTH) {
    throw Error(
    `Invalid public key. Expected a buffer of size ${COMPRESSED_PUBLIC_KEY_LENGTH} bytes. Got one of ${pubKey.length} bytes.`
    )
}

const secp256k1PubKey = new libp2p_crypto.supportedKeys.secp256k1.Secp256k1PublicKey(Buffer.from(pubKey))

const id = encode(secp256k1PubKey.bytes, 'identity')

return new PeerId(id, undefined, secp256k1PubKey)
}

hoprAddressFinder("0x82c04aF0643DacaeA09A60BaAA6cBc9E8E39c4bB")

import { ethers } from "ethers";
import {Buffer} from 'buffer';

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
        if(filter === undefined || filter.topics === undefined || filter.topics[1] === undefined){
            return ethAddress
        }
        let str = filter.topics[1].toString()
        var arr = new Uint8Array(str.length);
        for(var i=str.length; i--; ){
            arr[i] = str.charCodeAt(i);
        }  
        let r = Buffer.from(arr).toString("base64")
        console.log(r)
        return r
    } catch (err){
        console.error(err)
        return "not found"
    }
}
import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider("https://rpc.xdaichain.com");
const targetAddress = "0xD2F008718EEdD7aF7E9a466F5D68bb77D03B8F7A";
const targetABI = [
    "event ChannelUpdated(address indexed source, address indexed destination, (uint256,bytes32,uint256,uint256,uint8,uint256,uint32) newState)"
]

function getContract(address: string, abi :string[], provider: ethers.providers.BaseProvider) : ethers.Contract {
    return new ethers.Contract(address, abi, provider);
}

function main() {

    let fromBlock = 20307201;
    let contract = getContract(targetAddress, targetABI, provider);
    let filter = contract.filters.ChannelUpdated();

    contract.queryFilter(filter, fromBlock)
        .then((events) => {
            console.log(events + "\n" + events.length)
        });
}

main();
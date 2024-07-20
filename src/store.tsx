import { useEffect } from "react";
import { create } from "zustand";
import { EVMWallet } from "@catalogfi/wallets";
import { BrowserProvider } from "ethers";
import { GardenJS } from "@gardenfi/core";
import { Orderbook, Chains } from "@gardenfi/orderbook";
import {
  BitcoinNetwork,
  BitcoinOTA,
  BitcoinProvider,
} from "@catalogfi/wallets";

type EvmWalletState = {
  metaMaskIsConnected: boolean;
  evmProvider: BrowserProvider | null;
};

type EvmWalletAction = {
  connectMetaMask: () => Promise<void>;
};

const networkConfig = {
  chainId: "0x7A69", // Verify this chain ID with your local Ethereum node
  chainName: "Ethereum Localnet", // Ensure this matches the expected name
  rpcUrls: ["http://localhost:8545"], // Make sure this is the correct URL for your local node
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH", // Verify this symbol with your local node's configuration
    decimals: 18,
  },
};

const useMetaMaskStore = create<EvmWalletState & EvmWalletAction>((set) => ({
  metaMaskIsConnected: false,
  evmProvider: null,
  connectMetaMask: async () => {
    if (window.ethereum !== null) {
      let provider = new BrowserProvider(window.ethereum);
      let network = await provider.getNetwork();
      if (network.chainId !== 31337n) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [networkConfig],
        });
        provider = new BrowserProvider(window.ethereum);
      }
      set(() => ({
        evmProvider: provider,
        metaMaskIsConnected: true,
      }));
    } else {
      throw new Error("MetaMask not Found");
    }
  },
}));

type GardenStore = {
  garden: GardenJS | null;
  bitcoin: BitcoinOTA | null;
  setGarden: (garden: GardenJS, bitcoin: BitcoinOTA) => void;
};

const gardenStore = create<GardenStore>((set) => ({
  garden: null,
  bitcoin: null,
  setGarden: (garden: GardenJS, bitcoin: BitcoinOTA) => {
    set(() => ({
      garden,
      bitcoin,
    }));
  },
}));

type SignStore = {
  isMMPopupOpen: boolean;
  isSigned: boolean;
  setIsMMPopupOpen: (isMMPopupOpen: boolean) => void;
  setIsSigned: (isSigned: boolean) => void;
};

const useSignStore = create<SignStore>((set) => ({
  isMMPopupOpen: false,
  isSigned: false,
  setIsMMPopupOpen: (isMMPopupOpen: boolean) => {
    set(() => {
      return { isMMPopupOpen };
    });
  },
  setIsSigned: (isSigned: boolean) => {
    set(() => {
      return { isSigned };
    });
  },
}));

const useGarden = () => ({
  garden: gardenStore((state) => state.garden),
  bitcoin: gardenStore((state) => state.bitcoin),
});

const useGardenSetup = () => {
  const { evmProvider } = useMetaMaskStore();
  const { setGarden } = gardenStore();

  useEffect(() => {
    (async () => {
      if (!evmProvider) return;
      const signer = await evmProvider.getSigner();

      const bitcoinProvider = new BitcoinProvider(
        BitcoinNetwork.Regtest,
        "http://localhost:30000"
      );

      try {
        const orderbook = await Orderbook.init({
          url: "http://localhost:8080", // Ensure this matches the Merry Orderbook URL
          signer: signer,
          opts: {
            domain: (window as any).location.host,
            store: localStorage,
          },
        });

        const wallets = {
          [Chains.bitcoin_regtest]: new BitcoinOTA(bitcoinProvider, signer),
          [Chains.ethereum_localnet]: new EVMWallet(signer),
        };

        const garden = new GardenJS(orderbook, wallets);

        setGarden(garden, wallets[Chains.bitcoin_regtest]);
      } catch (error) {
        console.error("Failed to initialize GardenJS:", error);
        // Additional logging
        if ((error as any).response) {
          console.error("Error response:", (error as any).response);
        }
        if ((error as any).request) {
          console.error("Error request:", (error as any).request);
        }
      }
    })();
  }, [evmProvider, setGarden]);
};

export { useMetaMaskStore, useGarden, useGardenSetup, useSignStore };
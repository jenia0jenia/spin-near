import React, { useEffect, useState } from "react";
import classes from "./App.module.scss";
import * as nearAPI from "near-api-js";
import { Account, AccountBalance } from "near-api-js/lib/account";
import { ContractMethods } from "near-api-js/lib/contract";
import { Card, Button, Select, Divider } from "antd";
import BigNumber from "bignumber.js";
import { OrderBook } from "@lab49/react-order-book";
import "./order-book.css";
import {
  Market,
  MarketData,
  MarketIteratedData,
  TransformedMarketData,
} from "./interfaces";
import { config } from "./config";

const { connect, WalletConnection, utils, Contract } = nearAPI;

const { Option } = Select;

const contractOptions: ContractMethods = {
  viewMethods: ["markets", "view_market"],
  changeMethods: [],
};

const App = () => {
  const [walletInstance, setWalletInstance] =
    useState<nearAPI.WalletConnection>();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [walletBalance, setWalletBalance] = useState<AccountBalance>();
  const [contractInstance, setContractInstance] = useState<any>();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketData, setSelectedMarketData] =
    useState<TransformedMarketData>();

  const transformMarketData = (orderArr: MarketIteratedData[]) => {
    const result: String[][] = [];
    orderArr.forEach((item: any) =>
      result.push([
        Number(
          utils.format
            .formatNearAmount(BigNumber(item.price).toFixed())
            .replace(",", "")
        ).toFixed(4),
        Number(
          utils.format
            .formatNearAmount(BigNumber(item.quantity).toFixed())
            .replace(",", "")
        ).toFixed(4),
      ])
    );
    return result;
  };

  const bidAdapter = (marketData: MarketData) => {
    const result: TransformedMarketData = {
      asks: transformMarketData(marketData.ask_orders),
      bids: transformMarketData(marketData.bid_orders),
    };
    return result;
  };

  const getContractMarkets = async () => {
    if (!contractInstance) return;
    try {
      const contractMarkets = await contractInstance.markets({});
      setMarkets(contractMarkets);
    } catch (e) {
      console.log(e);
    }
  };

  const handleAuthUser = async () => {
    if (isSignedIn && walletInstance) {
      walletInstance.signOut();
      setIsSignedIn(false);
      setWalletInstance(undefined);
      setUserId("");
      setWalletBalance(undefined);
      setContractInstance(undefined);
      setMarkets([]);
      setSelectedMarketData(undefined);
    } else {
      try {
        await walletInstance
          ?.requestSignIn({ contractId: "app_2.spin_swap.testnet" })
          .catch(console.log);
      } catch (e) {
        console.log(e);
      }
    }
  };

  const handleClick = () => {
    handleAuthUser();
  };

  const handleMarketChange = (value: string) => {
    contractViewMarket(Number(value));
  };

  const contractViewMarket = async (value: number) => {
    if (!contractInstance) return;
    try {
      const selectedMarket: Market = markets[value];
      const contractMarket = await contractInstance.view_market({
        market_id: selectedMarket.id,
      });
      const filteredData = bidAdapter(contractMarket);
      setSelectedMarketData(filteredData);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    const initNearInstances = async () => {
      try {
        const near = await connect(config);
        const wallet = new WalletConnection(near, null);
        setWalletInstance(wallet);

        const isWalletSignedIn = wallet.isSignedIn();
        if (isWalletSignedIn) {
          const balance = await wallet.account().getAccountBalance();
          const contract = new Contract(
            wallet.account(),
            "app_2.spin_swap.testnet",
            contractOptions
          );
          setContractInstance(contract);
          setUserId(wallet.account().accountId);
          setWalletBalance(balance);
        }
      } catch (e) {
        console.log(e);
      }
    };

    initNearInstances();
  }, [isSignedIn]);

  useEffect(() => {
    if (walletInstance === undefined) return;
    if (walletInstance.isSignedIn()) {
      setIsSignedIn(true);
    } else {
      setIsSignedIn(false);
    }
  }, [walletInstance]);

  useEffect(() => {
    getContractMarkets();
  }, [contractInstance]);

  useEffect(() => {
    if (!contractInstance) return;
  }, [contractInstance]);

  return (
    <div className={classes.pageWrapper}>
      <Card
        title={isSignedIn ? `${userId}` : "Connect your wallet"}
        extra={
          <Button type="primary" onClick={handleClick}>
            {isSignedIn ? "Disconnect" : "Connect"}
          </Button>
        }
        style={{ width: 800 }}
      >
        {isSignedIn && walletBalance && (
          <>
            <p className={classes.balance}>
              Account Balance - $
              {Number(
                utils.format.formatNearAmount(walletBalance.available)
              ).toFixed(2)}{" "}
              NEAR
            </p>
            <Divider />
            <Select
              className={classes.pairSelect}
              onChange={handleMarketChange}
            >
              {markets.length > 0 &&
                markets.map(({ base, quote }: Market, index: number) => (
                  <Option value={index}>
                    {base.ticker}/{quote.ticker}
                  </Option>
                ))}
            </Select>
          </>
        )}
        {selectedMarketData && (
          <div className={classes.orderBook}>
            <OrderBook
              book={selectedMarketData}
              fullOpacity
              interpolateColor={(color: number[]) => color}
              listLength={10}
              stylePrefix="MakeItNiceAgain"
              showSpread={false}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default App;

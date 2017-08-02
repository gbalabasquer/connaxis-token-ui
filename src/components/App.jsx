import React, { Component } from 'react';
import NoConnection from './NoConnection';
import GeneralInfo from './GeneralInfo';
import Ranking from './Ranking';
import Requests from './Requests';
import web3, { initWeb3 } from  '../web3';
import { etherscanTx } from '../helpers';
import ReactNotify from '../notify';
import './App.css';

const addresses = require('../config/addresses');

const cnx = require('../config/cnx');

class App extends Component {
  constructor() {
    super();
    const initialState = this.getInitialState();
    this.state = {
      ...initialState,
      network: {},
      transactions: {},
      params: ''
    }
  }

  getInitialState = () => {
    return {
      cnx: {
        address: null,
      },
      vault: {
        address: null,
        balance: web3.toBigNumber(-1)
      },
      requests: {},
      wallets: {}
    };
  }

  checkNetwork = () => {
    web3.version.getNode((error) => {
      const isConnected = !error;

      // Check if we are synced
      if (isConnected) {
        web3.eth.getBlock('latest', (e, res) => {
          if (typeof(res) === 'undefined') {
            console.debug('YIKES! getBlock returned undefined!');
          }
          if (res.number >= this.state.network.latestBlock) {
            const networkState = { ...this.state.network };
            networkState['latestBlock'] = res.number;
            networkState['outOfSync'] = e != null || ((new Date().getTime() / 1000) - res.timestamp) > 600;
            this.setState({ network: networkState });
          } else {
            // XXX MetaMask frequently returns old blocks
            // https://github.com/MetaMask/metamask-plugin/issues/504
            console.debug('Skipping old block');
          }
        });
      }

      // Check which network are we connected to
      // https://github.com/ethereum/meteor-dapp-wallet/blob/90ad8148d042ef7c28610115e97acfa6449442e3/app/client/lib/ethereum/walletInterface.js#L32-L46
      if (this.state.network.isConnected !== isConnected) {
        if (isConnected === true) {
          web3.eth.getBlock(0, (e, res) => {
            let network = false;
            if (!e) {
              switch (res.hash) {
                case '0xa3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9':
                  network = 'kovan';
                  break;
                case '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3':
                  network = 'live';
                  break;
                default:
                  console.log('setting network to private');
                  console.log('res.hash:', res.hash);
                  network = 'private';
              }
            }
            if (this.state.network.network !== network) {
              this.initNetwork(network);
            }
          });
        } else {
          const networkState = { ...this.state.network };
          networkState['isConnected'] = isConnected;
          networkState['network'] = false;
          networkState['latestBlock'] = 0;
          this.setState({ network: networkState });
        }
      }
    });
  }

  initNetwork = (newNetwork) => {
    //checkAccounts();
    const networkState = { ...this.state.network };
    networkState['network'] = newNetwork;
    networkState['isConnected'] = true;
    networkState['latestBlock'] = 0;
    this.setState({ network: networkState });

    this.initContracts();
  }

  checkAccounts = () => {
    web3.eth.getAccounts((error, accounts) => {
      if (!error) {
        const networkState = { ...this.state.network };
        networkState['accounts'] = accounts;
        networkState['defaultAccount'] = accounts[0];
        web3.eth.defaultAccount = networkState['defaultAccount'];
        this.setState({ network: networkState });
      }
    });
  }

  componentDidMount = () => {
    setTimeout(this.init, 500);
  }

  init = () => {
    initWeb3(web3);

    this.checkNetwork();
    this.checkAccounts();

    //this.initContracts();

    this.checkAccountsInterval = setInterval(this.checkAccounts, 10000);
    this.checkNetworkInterval = setInterval(this.checkNetwork, 3000);
  }

  setHashParams = () => {
    const params = window.location.hash.replace(/^#\/?|\/$/g, '').split('/');
    this.setState({ params });
  }

  getBalance = (address) => {
    return new Promise((resolve, reject) => {
      this.cnxObj.balanceOf.call(address, (e, r) => {
        if (!e) {
          resolve(r);
        } else {
          reject(e);
        }
      });
    });
  }

  orderList = (wallets) => {
    const walletsOrdered = [];
    Object.keys(wallets).map(key => {
      // console.log({...walletsOrdered});
      if (walletsOrdered.length === 0 || wallets[key].balance.lte(walletsOrdered[walletsOrdered.length - 1].balance)) {
        walletsOrdered.push(wallets[key]);
      } else {
        for (let j = 0; j < walletsOrdered.length; j++) {
          if ((j === 0 && wallets[key].balance.gte(walletsOrdered[j].balance)) || (j !== 0 && wallets[key].balance.lte(walletsOrdered[j - 1].balance) && wallets[key].balance.gte(walletsOrdered[j].balance))) {
            for (let z = walletsOrdered.length; z >= j + 1; z--) {
              walletsOrdered[z] = walletsOrdered[z - 1];
            }
            walletsOrdered[j] = wallets[key];
            break;
          }
        }
      }
      return false;
    });
    return walletsOrdered;
  }

  methodSig = (method) => {
    return web3.sha3(method).substring(0, 10)
  }

  getBalances = () => {
    this.cnxObj.balanceOf.call(this.state.vault.address, (e, r) => {
      const vault = { ...this.state.vault };
      vault.balance = r;
      this.setState({ vault });
    });

    const promises = [];
    Object.keys(addresses[this.state.network.network].wallets).map(key => {
      promises.push(this.getBalance(key));
      return false;
    });

    Promise.all(promises).then((r) => {
      const wallets = {};
      let i = 0;
      Object.keys(addresses[this.state.network.network].wallets).map(key => {
        wallets[key] = {};
        wallets[key].address = key;
        wallets[key].balance = r[i];
        wallets[key].name = addresses[this.state.network.network].wallets[key];
        i++;
        return false;
      });
      
      this.setState({ wallets: this.orderList(wallets) });
    });
  }

  initContracts = () => {
    web3.reset(true);
    const initialState = this.getInitialState();
    initialState.cnx.address = addresses[this.state.network.network].cnx;
    initialState.vault.address = addresses[this.state.network.network].vault;
    window.cnxObj = this.cnxObj = web3.eth.contract(cnx).at(addresses[this.state.network.network].cnx);
    this.setState({
      ...initialState
    }, () => {
      this.getBalances();

      this.cnxObj.LogRequest({ receiver: this.state.network.defaultAccount ? this.state.network.defaultAccount : 1 }, { fromBlock: 0 }, (e, r) => {
        if (!e) {
          this.cnxObj.requests(r.args.pos, (e2, r2) => {
            if (!e2) {
              const requests = { ...this.state.requests };
              requests[r.args.pos] = {}
              requests[r.args.pos].title = r2[0];
              requests[r.args.pos].photo = r2[1];
              requests[r.args.pos].cost = r2[2];
              requests[r.args.pos].exchanged = r2[4];
              this.setState({ requests });
            }
          })
        }
      });

      this.cnxObj.LogPurchase({ receiver: this.state.network.defaultAccount ? this.state.network.defaultAccount : 1 }, { fromBlock: 'latest' }, (e, r) => {
        if (!e) {
          this.cnxObj.requests(r.args.pos, (e2, r2) => {
            if (!e2) {
              const requests = { ...this.state.requests };
              requests[r.args.pos].exchanged = true;
              this.setState({ requests });
              this.getBalances();
            }
          })
        }
      });
    });

    const filters = ['Transfer', 'LogNoteMint', 'LogNoteBurn'];

    for (let i = 0; i < filters.length; i++) {
      const conditions = {};
      if (filters[i] === 'LogNoteMint') {
        conditions.sig = this.methodSig('mint(uint128)');
        filters[i] = 'LogNote';
      }
      if (filters[i] === 'LogNoteBurn') {
        conditions.sig = this.methodSig('burn(uint128)');
        filters[i] = 'LogNote';
      }
      if (this.cnxObj[filters[i]]) {
        this.cnxObj[filters[i]](conditions, { fromBlock: 'latest' }, (e, r) => {
          if (!e) {
            this.getBalances();
          }
        });
      }
    }

    this.checkPendingTransactionsInterval = setInterval(this.checkPendingTransactions, 10000);
  }

  checkPendingTransactions = () => {
    const transactions = { ...this.state.transactions };
    Object.keys(transactions).map(tx => {
      if (transactions[tx].pending) {
        web3.eth.getTransactionReceipt(tx, (e, r) => {
          if (!e && r !== null) {
            if (r.logs.length > 0) {
              this.logTransactionConfirmed(tx);
            } else {
              this.logTransactionFailed(tx);
            }
          }
        });
      }
      return false;
    });
  }

  logPendingTransaction = (tx, title, callback = {}) => {
    const msgTemp = 'Transaction TX was created. Waiting for confirmation...';
    const transactions = { ...this.state.transactions };
    transactions[tx] = { pending: true, title, callback }
    this.setState({ transactions });
    console.log(msgTemp.replace('TX', tx))
    this.refs.notificator.info(tx, title, etherscanTx(this.state.network.network, msgTemp.replace('TX', `${tx.substring(0,10)}...`), tx), false);
  }

  logTransactionConfirmed = (tx) => {
    const msgTemp = 'Transaction TX was confirmed.';
    const transactions = { ...this.state.transactions };
    if (transactions[tx]) {
      transactions[tx].pending = false;
      this.setState({ transactions });

      this.refs.notificator.success(tx, transactions[tx].title, etherscanTx(this.state.network.network, msgTemp.replace('TX', `${tx.substring(0,10)}...`), tx), 4000);
    }
  }

  logTransactionFailed = (tx) => {
    const msgTemp = 'Transaction TX failed.';
    const transactions = { ...this.state.transactions };
    if (transactions[tx]) {
      transactions[tx].pending = false;
      this.setState({ transactions });
      this.refs.notificator.error(tx, transactions[tx].title, msgTemp.replace('TX', `${tx.substring(0,10)}...`), 4000);
    }
  }

  acceptExchange = (e) => {
    e.preventDefault();
    const id = e.target.getAttribute('data-id');
    if (window.confirm(`Are you sure you want to exchange prize ${id}?`)) {
      this.cnxObj.acceptExchange(id, (e, tx) => {
        if (!e) {
          this.logPendingTransaction(tx, `Exchanging prize ${id}`);
        } else {
          console.log(e);
        }
      });
    }

    return false;
  }

  renderMain() {
    return (
      <div className="content-wrapper">
        <section className="content-header">
          <h1>
            <img src="/connaxis.png" alt="Connaxis 10th Anniversary" />
          </h1>
        </section>
        <section className="content">
          <div>
            <div className="row">
              <div className="col-md-12">
                <GeneralInfo contract={ this.state.cnx.address } network={ this.state.network.network } account={ this.state.network.defaultAccount } />
              </div>
            </div>
            <div className="row">
              <div className="col-md-7">
                <Ranking network={ this.state.network.network } contract={ this.state.cnx.address } wallets={ this.state.wallets } vault={ this.state.vault } />
              </div>
              <div className="col-md-5">
                <Requests requests={ this.state.requests } acceptExchange={ this.acceptExchange } />
              </div>
            </div>
          </div>
        </section>
        <ReactNotify ref='notificator'/>
      </div>
    );
  }

  render() {
    return (
      this.state.network.isConnected ? this.renderMain() : <NoConnection />
    );
  }
}

export default App;

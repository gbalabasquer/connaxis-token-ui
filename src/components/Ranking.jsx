import React from 'react';
import { printNumber, etherscanToken } from '../helpers';

const Ranking = (props) => {
  return (
    <div className="box">
      <div className="box-header with-border">
        <h3 className="box-title">Ranking</h3>
      </div>
      <div className="box-body" id="cups">
        <div className="row">
          <div className="col-md-12">
            <table className="text-right">
              <thead>
                <tr>
                  <th>CNX Quantity</th>
                  <th>Team</th>
                  <th>Wallet</th>
                </tr>
              </thead>
              <tbody>
                  <tr key={props.vault.address}>
                    <td>{ printNumber(props.vault.balance) }</td>
                    <td><strong>Vault</strong></td>
                    <td>{ etherscanToken(props.network, props.vault.address, props.contract, props.vault.address) }</td>
                  </tr>
                {
                  Object.keys(props.wallets).map(key =>
                    <tr key={props.wallets[key].address}>
                      <td>
                        { printNumber(props.wallets[key].balance) }
                      </td>
                      <td>
                        { props.wallets[key].name }
                      </td>
                      <td>
                        { etherscanToken(props.network, props.wallets[key].address, props.contract, props.wallets[key].address) }
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ranking;

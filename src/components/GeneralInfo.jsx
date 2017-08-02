import React, { Component } from 'react';

import { etherscanAddress } from '../helpers';

class GeneralInfo extends Component {

  render() {
    return (
      <div className="box">
        <div className="box-header with-border">
          <h3 className="box-title">General Info</h3>
        </div>

        <div className="box-body">
          <div className="row">
            <div className="col-md-6">
              <div><strong>Network:</strong> { this.props.network }</div>
              <div><strong>Contract:</strong> { etherscanAddress(this.props.network, this.props.contract, this.props.contract) }</div>
              <div>
                <strong>Account:</strong>&nbsp;
                {
                  this.props.account
                    ? etherscanAddress(this.props.network, this.props.account, this.props.account)
                    : <span style={{color: 'red'}}>YOU NEED TO UNLOCK YOUR METAMASK ACCOUNT</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default GeneralInfo;

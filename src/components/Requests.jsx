import React from 'react';
import { printNumber } from '../helpers';

const Requests = (props) => {
  return (
    <div className="box">
      <div className="box-header with-border">
        <h3 className="box-title">Requests to exchange Prizes</h3>
      </div>
      <div className="box-body" id="cups">
        <div className="row">
          <div className="col-md-12">
            <table className="text-right">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Title</th>
                  <th>Photo</th>
                  <th>Cost (CNX)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {
                  Object.keys(props.requests).map(key =>
                    <tr key={key}>
                      <td>
                        { key }
                      </td>
                      <td>
                        { props.requests[key]['title'] }
                      </td>
                      <td>
                        <img src={ props.requests[key]['photo'] } alt={ props.requests[key]['title'] } width="100"/>
                      </td>
                      <td>
                        { printNumber(props.requests[key]['cost']) }
                      </td>
                      <td>
                        { !props.requests[key]['exchanged'] ? <a href="#action" data-id={ key } onClick={ props.acceptExchange }>Accept Exchange</a> : 'Exchanged!' }  
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

export default Requests;

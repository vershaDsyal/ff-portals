import React, { Component } from 'react';
import {Link} from 'react-router'
import ReactTable from 'react-table-6'
import {matchSorter} from 'match-sorter'
import NotificationAlert from 'react-notification-alert';
import Select from 'react-select';
import MySelect from "./MySelect.js";
import 'react-table-6/react-table.css'
import "react-notification-alert/dist/animate.css";
import $ from "jquery";

 

class EmployeeMapping extends Component {

    constructor(props) {
        super(props);
        this.state = {
            clubList: [''],
            employeeList: [''],
            TempEmployeeList:[''],
            userMapList:[''],
            Loader:false,
            fields: {},
            selectedOptions: [],
            errors: {},
            modalClasses: ['modal','fade'],
            modalValues:{},
            options : [],
            disableButton: "",
            disableUpdate:false,
            latest_file_id:0,
            loaded_records:"",
        };

        this.handleChange = this.handleChange.bind(this);
        this.onChange     = this.onChange.bind(this);
        this.onUpload     = this.onUpload.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
        this.handleModalClose  = this.handleModalClose.bind(this);
        this.handleModalOpen  = this.handleModalOpen.bind(this);
        this.handleUpdateStaff = this.handleUpdateStaff.bind(this);
    
    }
   
    componentDidMount() {    
         this.fetchEmployeeList();
    }

    handleModalClose(){
        setTimeout(function() {
             $('#defaultModal').modal('hide');
        }, 2500); 
        setTimeout(function() {
             $('#defaultModalEmployee').modal('hide');
        }, 2500); 
        this.setState({
            hrms_numberModal : '',
            employeeidModal : '',
            fullnameModal : '',
            emailModal : '',
            positionModal : '',
            positionidModal : '',
            TempEmployeeList:['']
            
        });
    }

    handleModalOpen(){
           $('#defaultModalUploaded').modal('show');
    }

    //Fetch All Employee List with their resp clubs
    fetchEmployeeList() {
        axios
            .get('/all-employee-list')
            .then(response => {  
                if(response.data.success){
                    this.setState({
                        employeeList: response.data.EmployeeList,
                    }); 
                }else{
                    console.log('Error..', response.data.success); 
                }
            }).catch(error => {
                console.log('Error..', error);                
            });  
            
    }

     //Fetch All temporary loaded Employee List
    fetchTemporaryUploaded() {
        axios
            .get('/all-temp-upload')
            .then(response => {  
                if(response.data.success){
                    this.setState({
                        TempEmployeeList: response.data.TempEmployeeList,
                    }); 
                }else{
                    console.log('Error..', response.data.success); 
                }
            }).catch(error => {
                console.log('Error..', error);                
            });  
            
    }

  
    handleValidation(){
        let fields = this.state.fields;
        let errors = {};
        let formIsValid = true;

        if(!fields["club_id"]){
          formIsValid = false;
          errors["club_id"] = "Please select Club";
        }

        this.setState({errors: errors});
        return formIsValid;
    }

    handleChange(selectedOptions){

         this.setState({ selectedOptions });
    }

    onChange(e) {
       
    this.setState({ 
            EmployeeData : { ...this.state.EmployeeData,
                [e.currentTarget.name]: e.currentTarget.value
            }
        });
    }    

    onUpload(e) {

        let errors = {};
        const imageFile = e.target.files[0];

        if (!imageFile) {
            errors[e.target.name] = 'Please upload image/pdf doc'
            this.setState({
                [e.currentTarget.name] : "",
                errors: errors,
            });
            return false;
        }       

        if (!imageFile.name.match(/\.(csv)$/)) {
            errors[e.target.name] = 'Please select valid CSV format';
            e.currentTarget.value = "";
            this.setState({
                [e.currentTarget.name] : "",
                errors: errors,
            });
          return false;
        }
 

        this.setState({ [e.currentTarget.name]: imageFile, errors:errors});
    }

    handleUpload(listdocument){
       
        const  selectedFile  = this.state.listdocument;
        let errors = {};
        if (!selectedFile) {
            errors['listdocument'] = 'Please upload valid csv file!!'
            this.setState({errors: errors});
            return false;
        }else{
            this.setState({errors: errors});
        }   
        this.setState({Loader:true,disableButton:"disabled"});     
        const formData = new FormData();
        formData.append('dataFile', selectedFile);
        axios.post('/upload-staff-file', formData).then(response => {
            this.setState({Loader:false});
            if(response.data.success){

                $('input[name="listdocument"]').val('');
                this.setState({
                    listdocument : "",
                    requestMessage:"",
                    disableButton:"disabled",
                    disableUpdate:true,
                    latest_file_id:response.data.latest_file_id,
                    loaded_records:response.data.loaded_records
                });
                this.refs.notify2.notificationAlert({
                place: 'br',
                message: (
                    <div>
                        Uploaded successfully.
                    </div>
                ),
                type: "success",
                icon: "now-ui-icons ui-1_bell-53",
                autoDismiss: 2
                }); 
                this.fetchTemporaryUploaded();
                this.handleModalOpen();
            }else{
                $('input[name="listdocument"]').val('');
                this.setState({
                    listdocument : "",
                    requestMessage:response.data.message,
                    disableButton:"",
                    disableUpdate:false
                });
                this.refs.notify2.notificationAlert({
                    place: 'br',
                    message: (
                    <div>
                        Oops! Something went wrong in uploading.
                    </div>
                    ),
                    type: "danger",
                    icon: "now-ui-icons ui-1_bell-53",
                    autoDismiss: 2
                }); 
            }
            
        }).catch(err => {
            console.log(err.message);
            $('input[name="listdocument"]').val('');
            this.setState({
                listdocument : "",
                requestMessage:response.data.message,
                disableButton:"",
                disableUpdate:false
            });
            this.refs.notify2.notificationAlert({
                        place: 'br',
                        message: (
                        <div>
                            Oops! Something went wrong with request.
                        </div>
                        ),
                        type: "danger",
                        icon: "now-ui-icons ui-1_bell-53",
                        autoDismiss: 2
            });
        });

    }

    // Update Staff list with uploaded file
    handleUpdateStaff(latest_file_id){
        this.setState({Loader:true});
        axios.post('/update-staff-bulk', {
            latest_file_id:latest_file_id
        }).then(response => {
            this.setState({Loader:false});
            if(response.data.success){
                
                this.setState({
                    latest_file_id : 0,
                    loaded_records:"",
                    requestMessage:"",
                    disableButton:"",
                    disableUpdate:false,
                    TempEmployeeList:['']
                });
                this.refs.notify2.notificationAlert({
                place: 'br',
                message: (
                    <div>
                        Updated Staff list successfully.
                    </div>
                ),
                type: "success",
                icon: "now-ui-icons ui-1_bell-53",
                autoDismiss: 2
            }); 
            this.fetchEmployeeList();

          }else{

            this.setState({
                requestMessage:response.data.message,
                disableButton:"disabled",
                disableUpdate:true,
                TempEmployeeList:['']
            });
            this.refs.notify2.notificationAlert({
                place: 'br',
                message: (
                <div>
                    Oops! Something went wrong in updating.
                </div>
                ),
                type: "danger",
                icon: "now-ui-icons ui-1_bell-53",
                autoDismiss: 2
            }); 
          }
            
        }).catch(err => {
            console.log(err.message);
            this.setState({
                requestMessage:response.data.message,
                disableButton:"disabled",
                disableUpdate:true,
                TempEmployeeList:['']
            });
            this.refs.notify2.notificationAlert({
                        place: 'br',
                        message: (
                        <div>
                            Oops! Something went wrong with request.
                        </div>
                        ),
                        type: "danger",
                        icon: "now-ui-icons ui-1_bell-53",
                        autoDismiss: 2
            });
        });
    }

    
    render(){
         const { selectedOption } = this.state.selectedOptions;
        return(
            <div className="row">
                
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-12">
                        <h3 className="section-title">Employee Mapping</h3>
                        <div className="card">                            
                            <div className="card-body">
                                <NotificationAlert ref="notify2" />
                                <form onSubmit={this.onFormSubmit} id="create-PAF">
                                    {this.state.requestMessage != '' && 
                                    <div className="alert alert-danger" role="alert">{this.state.requestMessage}
                                    </div>}
                                    <div className="row">
                                        <div className="form-group col-md-12">
                                            <label className="col-form-label"><mark>Bulk Upload Staff list (Valid csv format)</mark></label> 
                                            &nbsp;&nbsp;&nbsp; <a target="_blank" href="/public/Employee-data-upload-28-jan-2022.csv" download><i className="fas fa-download"></i> Sample</a>
                                            &nbsp;&nbsp;&nbsp; 
                                            {this.state.loaded_records != ''  && <span>Loaded Records : {this.state.loaded_records}</span> }
                                        </div>
                                     </div>
                                    <div className="row">
                                        <div className="form-group col-md-4">
                                           
                                            <input className="form-control" type="file" name="listdocument" accept=".csv" onChange={this.onUpload}/>
                                            <span className="text-danger">{this.state.errors['listdocument']}</span>
                                        </div>
                                        <div className="form-group col-md-4">
                                        
                                            <button type="button" className="btn btn-secondary"  onClick={this.handleUpload.bind(this,this.state.listdocument)} disabled={this.state.disableButton}>
                                                         <i className="fas fa-upload"></i>
                                            </button>    


                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

                                            {this.state.disableUpdate  && <button type="button" className="btn btn-success" onClick={this.handleUpdateStaff.bind(this,this.state.latest_file_id)}>
                                                    Start Update
                                            </button> }
                                        { this.state.Loader &&  <span className="dashboard-spinner spinner-xs"></span> }
                                        </div>

                                    </div>
                                 </form>
                            
                                <ReactTable
                                    data={this.state.employeeList}
                                    style={{overflow: "overlay"}}
                                    noDataText="Oh Noes!"
                                    filterable
                                    defaultFilterMethod={(filter, row) =>
                                    String(row[filter.id]) === filter.value}
                                    columns={[
                                        {              
                                            columns: [

                                                {
                                                    Header: "HRMS Number",
                                                    id: "hrms_number", 
                                                    width:100,
                                                    accessor: "hrms_number",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["hrms_number"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "Full Name",
                                                    id: "name", 
                                                    width:180,
                                                    accessor: "name",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["name"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "Position",
                                                    id: "position", 
                                                    width:180,
                                                    accessor: "position",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["position"] }),
                                                    filterAll:true,  
                                                     Cell: row => (
                                                    <div>
                                                       {row.original.hrms_number == '221729' ? "Assistant Manager - HR" : row.original.position}
                                                    </div> 
                                                    ),                                    
                                                },
                                                {
                                                    Header: "Email",
                                                    id: "email", 
                                                    width:180,
                                                    accessor: "email",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["email"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "Home Club",
                                                    id: "club", 
                                                    width:100,
                                                    accessor: "club",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["club"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "Other Clubs",
                                                    id: "action",
                                                    width:100,
                                                    accessor: 'id', 
                                                    filterable: false,
                                                    Cell: row => (
                                                    <div>
                                                        <button type="button" className="btn btn-primary btn-xs" data-toggle="modal" data-target="#defaultModal"   onClick={this.otherClubs.bind(this, row.original.hrms_number,row.original.employee_id,row.original.name,row.original.email,row.original.position_id,row.original.position,row.original.home_club,this.state.selectedOptions)}>
                                                                <i className="material-icons">Select</i>                                                
                                                        </button>
                                                    </div> 
                                                    ),                                               
                                                },
                                                {
                                                    Header: "Edit",
                                                    id: "action",
                                                    width:100,
                                                    accessor: 'id', 
                                                    filterable: false,
                                                    Cell: row => (
                                                    <div>
                                                        <button type="button" className="btn btn-primary btn-xs" data-toggle="modal" data-target="#defaultModalEmployee"   onClick={this.getEditEmployee.bind(this, row.original.hrms_number,row.original.employee_id)}>
                                                                <i className="material-icons">Edit</i>                                                
                                                        </button>
                                                    </div> 
                                                    ),                                               
                                                }
                                                     
                                            ]
                                        }            
                                    ]}

                                defaultPageSize={7}
                                className="-striped -highlight"
                                /> 
                                
                            </div>
                            
                        </div>
                    </div>

                <div className={this.state.modalClasses.join(' ')} id="defaultModalUploaded" role="dialog" aria-labelledby="defaultModalLabel" aria-hidden="true">
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="defaultModalLabel">
                                <i>Check Uploaded Format </i></h5><br/>
                                 
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <ReactTable
                                    data={this.state.TempEmployeeList}
                                    style={{overflow: "overlay"}}
                                    noDataText="Oh Noes!"
                                    filterable
                                    defaultFilterMethod={(filter, row) =>
                                    String(row[filter.id]) === filter.value}
                                    columns={[
                                        {              
                                            columns: [

                                                {
                                                    Header: "HRMS Number",
                                                    id: "hrms_number", 
                                                    width:100,
                                                    accessor: "hrms_number",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["hrms_number"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "Full Name",
                                                    id: "full_name", 
                                                    width:180,
                                                    accessor: "full_name",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["full_name"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "DOJ",
                                                    id: "gdoj", 
                                                    width:100,
                                                    accessor: "gdoj",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["gdoj"] }),
                                                    filterAll: true,                                    
                                                },
                                                {
                                                    Header: "Position",
                                                    id: "position", 
                                                    width:180,
                                                    accessor: "position",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["position"] }),
                                                    filterAll:true,  
                                                                                         
                                                },
                                                {
                                                    Header: "Department",
                                                    id: "department", 
                                                    width:180,
                                                    accessor: "department",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["department"] }),
                                                    filterAll:true,  
                                                                                         
                                                },
                                                {
                                                    Header: "Organization",
                                                    id: "organization", 
                                                    width:100,
                                                    accessor: "organization",
                                                    filterMethod: (filter, rows) =>
                                                        matchSorter(rows, filter.value, { keys: ["organization"] }),
                                                    filterAll: true,                                    
                                                },
                                              
                                            ]
                                        }            
                                    ]}

                                defaultPageSize={7}
                                className="-striped -highlight"
                                /> 
                                </div>
                                <div className="modal-footer">

                                    <button type="button" onClick={this.handleModalClose} className="btn btn-secondary" data-dismiss="modal">Close</button>
                                    <button type="button"  onClick={this.handleModalClose} className="btn btn-success" data-dismiss="modal">OK</button>
                                
                                        
                                </div>
                        
                            </div>
                            
                            
                        </div>
                    </div>
                </div>

            </div>
        );
    }
}   



export default EmployeeMapping;
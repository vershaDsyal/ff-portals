<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Auth;
use DB;
use PDF;
use Log;
use App\User as User;
use App\Club as Club;
use App\Position as Position;
use App\Department as Department;
use App\Permission as Permission;
use App\UserMapping as UserMapping;
use App\BulkUploadFile as BulkUploadFile;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function index()
    {
        return view('home');
    }
    
    /**
     * Get employee list
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function allEmployeeList()
    {
        $EmployeeList = DB::table('users')
            ->select('users.*')
            ->where('users.active',1)
            ->where('users.Non_Employee', '!=' , 1)
            ->orderBy('users.name','asc')->get();
        
        if($EmployeeList){
            $result = array('success' => true, 'EmployeeList' => $EmployeeList);
        }else{

            $result = array('success' => false);
        }

        return response()->json($result);
    }
    


    /**
    * Bulk upload Staff file
    *
    * @return \Illuminate\Contracts\Support\Renderable
    */
    public function uploadStaffFile(Request $request){

        $params = $request->all();
        $folder = '/bulk-upload/';
        $path = public_path().'/uploads/bulk-upload';
        $UploadedFileName = $finalPath = '';
        if (!is_dir($path)) {
            File::makeDirectory($path, $mode = 0777, true, true);
        }
        $destinationDir = $path.'/';
        if(is_dir($path)){
            if( !empty(\Request::file('dataFile')) ){

                $file= \Request::file('dataFile');
                $filename = \Request::file('dataFile')->getClientOriginalName();
                $cleaned_filename = preg_replace("/[^a-z0-9-_\.]/", "_", strtolower($filename));
                $new_filename = pathinfo($cleaned_filename)['filename'] . '_' . time() . '.'.pathinfo($cleaned_filename)['extension'];

                //if previously uploaded image is in uploads folder then remove it
                if( isset($params['hdnCurrentImg']) && $params['hdnCurrentImg'] && $params['hdnCurrentImg'] != "null" ){
                     unlink($destinationDir . $params['hdnCurrentImg']);
                }

                $image = file_get_contents($file);
                if (!$saved_image = file_put_contents($destinationDir . $new_filename, $image)) {
                    throw new \Exception("$destinationDir . $filename could not be uploaded for PAF", 1);
                }

                $UploadedFileName = $new_filename;
                $finalPath = $folder.$UploadedFileName;
                // save paf file in its table using its model file
                $AddDoc = new BulkUploadFile;
                $AddDoc->doc_file_name = $UploadedFileName;
                $AddDoc->doc_folder    = '/public'.$finalPath;
                $AddDoc->status        = 0;
                if($AddDoc->save()){

                    $latest_file_id = $AddDoc->file_id;
                    $latest_file = BulkUploadFile::where('file_id',$latest_file_id)->first();
                    
                   /* 1.START LOAD file in users_loaded Table After matching headers*/

                    $file= "./uploads/bulk-upload/".$latest_file->doc_file_name;
                    
                    //headers we expect
                    $requiredHeaders = array('territory', 'hrms_number', 'title', 'full_name','organization','gender','gdoj','position','department','band','email'); 
                    try
                    {

                        if ( !file_exists($file) ) {
                            //throw new \Exception($file .' File not found.');
                            $result = array('success' => false, 'message' => $file .' File not found.' );
                        }
                        $f = fopen($file, 'r');
                        if ( !$f ) {
                            //throw new \Exception($file .' File open failed.');
                            $result = array('success' => false, 'message' => $file .' File open failed.' );
                          }  
                        $firstLine = fgets($f); //get first line of csv file
                        fclose($f); // close file    

                        $foundHeaders = str_getcsv(trim($firstLine), ',', '"'); //parse to array

                    
                        if ($foundHeaders !== $requiredHeaders) {
                          
                           //throw new \Exception('error in '.'Headers do not match: '.implode(', ', $foundHeaders), 1);
                            Log::error('error in '.'Headers do not match: '.implode(', ', $foundHeaders));
                           $result = array('success' => false, 'message' => 'error in '.'Headers do not match: '.implode(', ', $foundHeaders) );
                        }else{
                            
                             DB::table('users_loaded')->truncate();
                            $query = "LOAD DATA LOCAL INFILE '$file' INTO TABLE users_loaded
                                          FIELDS TERMINATED BY ','
                                          LINES TERMINATED BY '\n'
                                          IGNORE 1 LINES (territory, hrms_number, title, full_name, organization, gender, gdoj , position, department, band,email)";

                              $pdo = DB::connection()->getPdo();
                                
                              if($pdo->exec($query)){
                                
                                $latest_file->status = 1;
                                $latest_file->save();
                                
                                $loaded_records = DB::table('users_loaded')->count();
                                $result = array('success' => true, 'finalPath' => $finalPath ,'message' => 'File uploaded successfully','filename' => $UploadedFileName, 'latest_file_id' => $latest_file_id,'loaded_records' => $loaded_records );

                              }else{

                                  //throw new \Exception( 'error in loading users_loaded table', 1);
                                Log::error('error in loading users_loaded table');
                                $result = array('success' => false, 'message' => 'error in loading users_loaded table' );
                              }
                             
                        }

                    } catch ( \Exception $e ) {

                        //throw new \Exception('error in '.$e->getMessage(), 1);
                        Log::error('error in '.$e->getMessage());
                       $result = array('success' => false, 'message' => 'error in '.$e->getMessage() );
                    }   
                     
                }else{
                     Log::error('error in table update for file bulk uload');
                     $result = array('success' => false, 'message' => 'error in table update for file bulk uload' );
                }
                
            }else{
                 $result = array('success' => false, 'message' => 'file not found!!' );
            }
        }else{
            $result = array('success' => false, 'message' => 'Directory not found!!' );
        }
       return response()->json($result); 
    }

    /**
    * Bulk Update Staff list in Users Table
    *
    * @return \Illuminate\Contracts\Support\Renderable
    */
    public function updateStaffBulk(Request $request)
    {
        
        $params = $request->all();
       
        if(isset($params['latest_file_id'])  && $params['latest_file_id'] != 0){

        //** START Take users table backup  ** //
          $tablename = 'users_backup_'.$params['latest_file_id'].'_'.date('d_m_Y');
          \DB::statement('CREATE TABLE '.$tablename.' LIKE users');
          \DB::statement('INSERT '.$tablename.' SELECT * FROM users');
        //** END Take users table backup  ** //

          // call procedure for bulk update staff
        
          try { 
                $results = DB::select('CALL bulk_update_employee');
                // update user mappings 
                $result = array('success' => true);
                
            } catch(\Illuminate\Database\QueryException $ex){ 
                
              Log::error('Error procedure bulk_update_employee with message'.$ex->getMessage());
               $result = array('success' => false, 'message' => $ex->getMessage());
              // Note any method of class PDOException can be called on $ex.
            }
          

        }

        return response()->json($result);   

    }


}

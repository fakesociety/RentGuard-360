import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict, Counter

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

contracts_table = dynamodb.Table('RentGuard-Contracts')
analysis_table = dynamodb.Table('RentGuard-Analysis')

# Your Cognito User Pool ID - UPDATE THIS
USER_POOL_ID = 'us-east-1_rwsncOnh1'  # Get from environment or hardcode

def lambda_handler(event, context):
    """
    Get System Statistics - Admin Only
    
    Returns:
    - Total contracts, analyzed, pending, failed counts
    - Average risk score
    - Total users
    - Active users (last 30 days)
    - Contracts over time chart data
    - User registrations over time chart data
    - Risk distribution
    - Common issues list
    """
    try:
        # --- SECURITY: Verify Admin Group ---
        # Debug: Log the full event structure
        print(f"Full event keys: {list(event.keys())}")
        
        # Try multiple paths for authorizer claims (different API Gateway configurations)
        claims = {}
        
        # Path 1: Standard Cognito Authorizer
        if 'requestContext' in event:
            auth = event['requestContext'].get('authorizer', {})
            claims = auth.get('claims', auth)
        
        # Path 2: JWT Authorizer (HTTP API)
        if not claims and 'requestContext' in event:
            jwt_claims = event['requestContext'].get('authorizer', {}).get('jwt', {}).get('claims', {})
            if jwt_claims:
                claims = jwt_claims
        
        groups = claims.get('cognito:groups', '')
        
        # Handle groups - could be string "[Admins]" or list ["Admins"]
        is_admin = False
        if isinstance(groups, list):
            is_admin = 'Admins' in groups
        elif isinstance(groups, str) and groups:
            is_admin = 'Admins' in groups
        
        if not is_admin:
            return {
                'statusCode': 403,
                'headers': cors_headers(),
                'body': json.dumps({
                    'error': 'Admin access required',
                    'debug': {
                        'groups_found': str(groups),
                        'claims_keys': list(claims.keys()) if claims else []
                    }
                })
            }
        
        # --- Scan Contracts Table ---
        contracts = scan_all_items(contracts_table)
        
        total_contracts = len(contracts)
        analyzed = sum(1 for c in contracts if c.get('status') == 'analyzed')
        pending = sum(1 for c in contracts if c.get('status') in ['pending', 'uploaded', 'processing'])
        failed = sum(1 for c in contracts if c.get('status') == 'failed')
        
        # --- Average Risk Score & Risk Distribution ---
        risk_scores = []
        risk_dist = {
            'lowRisk': 0,      # 86-100
            'lowMediumRisk': 0, # 71-85
            'mediumRisk': 0,    # 51-70
            'highRisk': 0       # 0-50
        }
        
        contracts_by_day = {}
        thirty_days_ago_date = (datetime.utcnow() - timedelta(days=30)).date()

        for c in contracts:
            # Risk Score Collection
            if c.get('riskScore'):
                try:
                    score = float(c.get('riskScore'))
                    risk_scores.append(score)
                    
                    if score >= 86:
                        risk_dist['lowRisk'] += 1
                    elif score >= 71:
                        risk_dist['lowMediumRisk'] += 1
                    elif score >= 51:
                        risk_dist['mediumRisk'] += 1
                    else:
                        risk_dist['highRisk'] += 1
                except:
                    pass

            # Contracts by Day (Last 30 Days)
            if c.get('analyzedDate'):
                try:
                    analyzed_date = datetime.fromisoformat(c['analyzedDate'].replace('Z', '+00:00')).date()
                    if analyzed_date >= thirty_days_ago_date:
                        date_str = analyzed_date.isoformat()
                        contracts_by_day[date_str] = contracts_by_day.get(date_str, 0) + 1
                except:
                    pass

        avg_risk_score = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0
        
        # --- Contracts Timeline (Fill missing days) ---
        current_date = thirty_days_ago_date
        today = datetime.utcnow().date()
        time_series = []
        while current_date <= today:
            date_str = current_date.isoformat()
            time_series.append({
                'date': date_str,
                'analyzed': contracts_by_day.get(date_str, 0)
            })
            current_date += timedelta(days=1)
            
        # --- Average analysis time ---
        analysis_times = []
        for c in contracts:
            if c.get('uploadDate') and c.get('analyzedDate'):
                try:
                    upload = datetime.fromisoformat(c['uploadDate'].replace('Z', '+00:00'))
                    analyzed_date = datetime.fromisoformat(c['analyzedDate'].replace('Z', '+00:00'))
                    diff_seconds = (analyzed_date - upload).total_seconds()
                    if diff_seconds > 0:
                        analysis_times.append(diff_seconds)
                except:
                    pass
        avg_analysis_time = round(sum(analysis_times) / len(analysis_times), 1) if analysis_times else 0
        
        # --- Cognito User Stats & Registrations Over Time ---
        user_count = 0
        active_users_30d = set()
        user_registrations_raw = defaultdict(int) # Key: date (iso format), Value: count
        
        try:
            paginator = cognito.get_paginator('list_users')
            for page in paginator.paginate(UserPoolId=USER_POOL_ID):
                users_page = page['Users']
                user_count += len(users_page)
                
                # Aggregate registrations by date (bucket by week or day)
                # We'll use weekly buckets for the chart (last 10 weeks) or daily if sparse
                for u in users_page:
                    create_date = u.get('UserCreateDate')
                    if create_date:
                        # Convert to YYYY-MM-DD
                        d_str = create_date.date().isoformat()
                        user_registrations_raw[d_str] += 1
                        
        except Exception as e:
            print(f"Cognito error: {e}")
            
        # Format User Registrations for Chart (last 60 days for granular view)
        user_reg_chart = []
        reg_start_date = datetime.utcnow().date() - timedelta(days=60)
        curr = reg_start_date
        while curr <= today:
            d_str = curr.isoformat()
            user_reg_chart.append({
                'date': d_str,
                'count': user_registrations_raw.get(d_str, 0)
            })
            curr += timedelta(days=1)

        # Active users = unique userIds with contracts in last 30 days
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        for c in contracts:
            if c.get('uploadDate', '') >= thirty_days_ago:
                active_users_30d.add(c.get('userId'))

        # --- Common Issues (Scan Analysis Table) ---
        common_issues_list = []
        try:
            analysis_items = scan_all_items(analysis_table)
            issue_tracker = {} # Key: rule_id, Value: {'topic': topic, 'count': 0}
            
            for item in analysis_items:
                res = item.get('analysis_result')
                # Handle potential JSON string
                if isinstance(res, str):
                    try:
                        res = json.loads(res)
                    except:
                        continue
                
                if isinstance(res, dict):
                    issues = res.get('issues', [])
                    for issue in issues:
                        rule_id = issue.get('rule_id')
                        topic = issue.get('clause_topic')
                        
                        if rule_id and topic:
                            # Normalize key
                            key = rule_id.upper()
                            if key not in issue_tracker:
                                issue_tracker[key] = {'code': key, 'topic': topic, 'count': 0}
                            issue_tracker[key]['count'] += 1
            
            # Convert to list and sort by count
            common_issues_list = list(issue_tracker.values())
            common_issues_list.sort(key=lambda x: x['count'], reverse=True)
            common_issues_list = common_issues_list[:5] # Top 5
            
        except Exception as e:
            print(f"Error scanning analysis table: {e}")
            # Non-critical failure, return empty list

        # --- Build Response ---
        stats = {
            'contracts': {
                'total': total_contracts,
                'analyzed': analyzed,
                'pending': pending,
                'failed': failed
            },
            'analysis': {
                'avgRiskScore': avg_risk_score,
                'avgAnalysisTimeSeconds': avg_analysis_time
            },
            'users': {
                'total': user_count,
                'activeLast30Days': len(active_users_30d)
            },
            'riskDistribution': risk_dist,
            'commonIssues': common_issues_list,
            'contractsByDay': time_series,
            'userRegistrations': user_reg_chart,
            'generatedAt': datetime.utcnow().isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps(stats, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def scan_all_items(table):
    """Scan entire DynamoDB table (handles pagination)."""
    items = []
    response = table.scan()
    items.extend(response.get('Items', []))
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
    
    return items


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }


class DecimalEncoder(json.JSONEncoder):
    """Handle DynamoDB Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


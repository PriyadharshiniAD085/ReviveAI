from pathlib import Path
import random,pandas as pd,joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
BASE=Path(__file__).resolve().parents[2];DATA=BASE/'data';MODELS=BASE/'ml'/'models';DATA.mkdir(exist_ok=True);MODELS.mkdir(exist_ok=True)
random.seed(42);reasons=['BANK_TIMEOUT','NETWORK_ERROR','INSUFFICIENT_FUNDS','LIMIT_EXCEEDED','PAYMENT_DECLINED','AUTHENTICATION_FAILED','SUSPICIOUS_TRANSACTION'];rows=[]
for _ in range(5000):
 amount=round(random.uniform(250,75000),2);reason=random.choice(reasons);hour=random.randint(0,23);rows.append({'amount':amount,'failure_reason':reason,'hour':hour,'label':'MANUAL_REVIEW' if reason=='SUSPICIOUS_TRANSACTION' or amount>=50000 else 'AUTOMATED_RECOVERY'})
df=pd.DataFrame(rows);df.to_csv(DATA/'transactions.csv',index=False);X=df[['amount','failure_reason','hour']];y=df['label'];pre=ColumnTransformer([('reason',OneHotEncoder(handle_unknown='ignore'),['failure_reason']),('num','passthrough',['amount','hour'])]);model=Pipeline([('preprocessor',pre),('classifier',RandomForestClassifier(n_estimators=120,random_state=42,class_weight='balanced'))]);a,b,c,d=train_test_split(X,y,test_size=.2,random_state=42,stratify=y);model.fit(a,c);p=model.predict(b);print('Dataset created successfully:',len(df),'transactions');print('\nStatus distribution:');print(df['label'].value_counts());print('\nTotal transaction value:');print(f'₹{df.amount.sum():,.2f}');print('\nClassification report:');print(classification_report(d,p));joblib.dump(model,MODELS/'recovery_model.joblib');print('\nModel saved to ml/models/recovery_model.joblib')
